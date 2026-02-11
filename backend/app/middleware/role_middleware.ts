import type { HttpContext } from '@adonisjs/core/http'

export default class RoleMiddleware {
  /**
   * Middleware para validar roles dinámicos.
   * @param ctx HttpContext
   * @param next Función para continuar
   * @param roles Array de roles permitidos, p.ej: ["admin"] o ["admin","trabajador"]
   */
  public async handle(
    { auth, response }: HttpContext,
    next: () => Promise<void>,
    roles: string[]
  ) {
    const user = auth.user

    // Si no hay usuario logueado
    if (!user) {
      return response.unauthorized({ message: 'No autorizado' })
    }

    // Si el rol del usuario no está en la lista
    if (!roles.includes(user.role)) {
      return response.forbidden({ message: 'No tienes permisos' })
    }

    // Si pasa las validaciones, continúa
    await next()
  }
}
