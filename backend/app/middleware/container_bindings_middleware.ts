// app/middleware/container_bindings_middleware.ts
import { Logger } from '@adonisjs/core/logger'
import { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

export default class ContainerBindingsMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    ctx.containerResolver.bindValue(HttpContext, ctx)
    ctx.containerResolver.bindValue(Logger, ctx.logger)
    
    await next() // Asegúrate de usar await
  }
}