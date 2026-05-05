import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

export default class AdminMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    if (!ctx.currentUser || ctx.currentUser.role !== 'admin') {
      return ctx.response.forbidden({ message: 'No tienes permisos' })
    }

    return next()
  }
}
