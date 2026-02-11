// start/kernel.ts
import server from '@adonisjs/core/services/server'

/**
 * The error handler is used to convert an exception
 * to an HTTP response.
 */
server.errorHandler(() => import('#exceptions/handler'))

/**
 * ONLY essential middleware from packages
 */
server.use([
  () => import('@adonisjs/core/bodyparser_middleware'),
  () => import('@adonisjs/cors/cors_middleware'),
  () => import('@adonisjs/auth/initialize_auth_middleware'),
])

/**
 * NO named middleware for now
 */