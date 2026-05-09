// app/controllers/auth_controller.ts
import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'
import ApiToken from '#models/api_token'
import Hash from '@adonisjs/core/services/hash'
import { randomUUID } from 'node:crypto'
import { DateTime } from 'luxon'

const ACCESS_TOKEN_TTL_MINUTES = 30
const REFRESH_TOKEN_TTL_DAYS = 30
const LOGIN_WINDOW_MS = 15 * 60 * 1000
const LOGIN_MAX_ATTEMPTS = 5

type LoginAttempt = {
  count: number
  resetAt: number
}

const loginAttempts = new Map<string, LoginAttempt>()

function getLoginKey(ip: string, username: string) {
  return `${ip}:${username.toLowerCase().trim()}`
}

function getLoginAttempt(key: string) {
  const now = Date.now()
  const current = loginAttempts.get(key)

  if (!current || current.resetAt <= now) {
    const freshAttempt = { count: 0, resetAt: now + LOGIN_WINDOW_MS }
    loginAttempts.set(key, freshAttempt)
    return freshAttempt
  }

  return current
}

function registerFailedLogin(key: string) {
  const attempt = getLoginAttempt(key)
  attempt.count += 1
  loginAttempts.set(key, attempt)
  return attempt
}

function serializeUser(user: User) {
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
  }
}

export default class AuthController {
  private async issueTokenPair(user: User) {
    const accessTokenValue = randomUUID().replace(/-/g, '')
    const refreshTokenValue = randomUUID().replace(/-/g, '') + randomUUID().replace(/-/g, '')
    const accessExpiresAt = DateTime.utc().plus({ minutes: ACCESS_TOKEN_TTL_MINUTES })
    const refreshExpiresAt = DateTime.utc().plus({ days: REFRESH_TOKEN_TTL_DAYS })

    const accessToken = await user.related('apiTokens').create({
      type: 'access',
      token: accessTokenValue,
      expiresAt: accessExpiresAt,
    })

    const refreshToken = await user.related('apiTokens').create({
      type: 'refresh',
      token: refreshTokenValue,
      expiresAt: refreshExpiresAt,
    })

    return {
      type: 'bearer',
      token: accessToken.token,
      expiresAt: accessToken.expiresAt,
      refreshToken: refreshToken.token,
      refreshExpiresAt: refreshToken.expiresAt,
      user: serializeUser(user),
    }
  }

  public async login({ request, response }: HttpContext) {
    const { username, password } = request.only(['username', 'password'])
    const loginKey = getLoginKey(request.ip(), username || '')
    const attempt = getLoginAttempt(loginKey)

    if (attempt.count >= LOGIN_MAX_ATTEMPTS) {
      const retryAfterSeconds = Math.ceil((attempt.resetAt - Date.now()) / 1000)
      response.header('Retry-After', String(retryAfterSeconds))

      return response.tooManyRequests({
        message: 'Demasiados intentos. Intenta nuevamente en unos minutos.',
      })
    }

    try {
      // 1. Buscar usuario
      const user = await User.findBy('username', username)

      if (!user) {
        registerFailedLogin(loginKey)
        return response.unauthorized({
          message: 'Credenciales incorrectas',
        })
      }

      // 2. Verificar contraseña
      const isValid = await Hash.verify(user.password, password)

      if (!isValid) {
        registerFailedLogin(loginKey)
        return response.unauthorized({
          message: 'Credenciales incorrectas',
        })
      }

      loginAttempts.delete(loginKey)
      await user.related('apiTokens').query().whereIn('type', ['api', 'access', 'refresh']).delete()

      return this.issueTokenPair(user)
    } catch (error) {
      console.error('Login error:', error)
      return response.unauthorized({
        message: 'Error en el servidor',
      })
    }
  }

  public async refresh({ request, response }: HttpContext) {
    const refreshTokenValue = request.input('refreshToken')

    if (!refreshTokenValue) {
      return response.unauthorized({ message: 'Refresh token requerido' })
    }

    const refreshToken = await ApiToken.query()
      .where('token', refreshTokenValue)
      .where('type', 'refresh')
      .preload('user')
      .first()

    if (!refreshToken?.user) {
      return response.unauthorized({ message: 'Sesion invalida' })
    }

    if (refreshToken.expiresAt && refreshToken.expiresAt <= DateTime.utc()) {
      await refreshToken.delete()
      return response.unauthorized({ message: 'Sesion expirada' })
    }

    const user = refreshToken.user
    await refreshToken.delete()
    await user.related('apiTokens').query().where('type', 'access').delete()

    return this.issueTokenPair(user)
  }

  public async logout({ request, response }: HttpContext) {
    const authHeader = request.header('authorization')
    const token = authHeader?.replace('Bearer ', '').trim()
    const refreshToken = request.input('refreshToken')

    if (token) {
      await ApiToken.query().where('token', token).delete()
    }

    if (refreshToken) {
      await ApiToken.query().where('token', refreshToken).delete()
    }

    return response.ok({ message: 'Sesion cerrada' })
  }
}
