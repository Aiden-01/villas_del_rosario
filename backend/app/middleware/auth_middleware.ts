import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import ApiToken from '#models/api_token'
import User from '#models/user'

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

    const apiToken = await ApiToken.query().where('token', token).preload('user').first()

    if (!apiToken?.user) {
      return ctx.response.unauthorized({ message: 'No autorizado' })
    }

    ctx.currentUser = apiToken.user
    return next()
  }
}
