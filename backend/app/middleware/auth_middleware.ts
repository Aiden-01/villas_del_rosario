import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import ApiToken from '#models/api_token'
import User from '#models/user'
import { DateTime } from 'luxon'

declare module '@adonisjs/core/http' {
  interface HttpContext {
    currentUser?: User
  }
}

export default class AuthMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const authHeader = ctx.request.header('authorization')
    const token = authHeader?.replace('Bearer ', '').trim()

    if (!token) {
      return ctx.response.unauthorized({ message: 'No autorizado' })
    }

    const apiToken = await ApiToken.query()
      .where('token', token)
      .whereIn('type', ['api', 'access'])
      .preload('user')
      .first()

    if (!apiToken?.user) {
      return ctx.response.unauthorized({ message: 'No autorizado' })
    }

    if (apiToken.expiresAt && apiToken.expiresAt <= DateTime.utc()) {
      await apiToken.delete()
      return ctx.response.unauthorized({ message: 'Sesion expirada' })
    }

    ctx.currentUser = apiToken.user
    return next()
  }
}
