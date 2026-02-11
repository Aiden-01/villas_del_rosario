import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'
import crypto from 'node:crypto'

export default class AuthController {
  public async login({ request, response }: HttpContext) {
    const { username, password } = request.only(['username', 'password'])

    const user = await User.findBy('username', username)
    if (!user) {
      return response.unauthorized({ message: 'Credenciales incorrectas' })
    }

    const valid = await user.verifyPassword(password)
    if (!valid) {
      return response.unauthorized({ message: 'Credenciales incorrectas' })
    }

    const token = await user.related('apiTokens').create({
      type: 'api',
      token: crypto.randomUUID().replace(/-/g, ''),
    })

    return {
      message: 'Login exitoso',
      token: token.token,
      user,
    }
  }
}
