// app/middleware/force_json_response_middleware.ts
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

export default class ForceJsonResponseMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    // Solo establecer header si no existe
    if (!ctx.response.getHeader('content-type')) {
      ctx.response.header('Content-Type', 'application/json')
    }
    await next()
  }
}