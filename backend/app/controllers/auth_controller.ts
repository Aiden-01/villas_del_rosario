// app/controllers/users_controller.ts
import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'

export default class UsersController {
  /**
   * Listar usuarios (SOLO ADMIN)
   */
  async index({ auth, response }: HttpContext) {
    try {
      // El middleware 'auth' ya verificó la autenticación
      // Solo verificamos el rol
      if (auth.user!.role !== 'admin') {
        return response.forbidden({ message: 'No tienes permisos de administrador' })
      }

      const users = await User.query().select('id', 'name', 'username', 'email', 'role', 'createdAt')
      return response.ok(users)
    } catch (error) {
      console.error('Error en index:', error)
      return response.internalServerError({ message: 'Error al obtener usuarios' })
    }
  }

  /**
   * Crear usuario (SOLO ADMIN)
   */
  async store({ auth, request, response }: HttpContext) {
    try {
      // Verificar que sea admin
      if (auth.user!.role !== 'admin') {
        return response.forbidden({ message: 'No tienes permisos de administrador' })
      }

      const data = request.only(['name', 'email', 'username', 'password', 'role'])
      
      // Validaciones
      if (!data.name || !data.username || !data.password || !data.role) {
        return response.badRequest({ message: 'Todos los campos son requeridos' })
      }

      if (!['admin', 'trabajador'].includes(data.role)) {
        return response.badRequest({ message: 'Rol inválido. Use: admin o trabajador' })
      }

      // Verificar si el usuario ya existe
      const existingUser = await User.findBy('username', data.username)
      if (existingUser) {
        return response.conflict({ message: 'El nombre de usuario ya está en uso' })
      }

      // Crear usuario
      const user = await User.create(data)
      
      return response.created({
        message: 'Usuario creado exitosamente',
        user: {
          id: user.id,
          name: user.name,
          username: user.username,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt
        }
      })
    } catch (error) {
      console.error('Error en store:', error)
      return response.internalServerError({ message: 'Error al crear usuario' })
    }
  }

  /**
   * Eliminar usuario (SOLO ADMIN)
   */
  async destroy({ auth, params, response }: HttpContext) {
    try {
      // Verificar que sea admin
      if (auth.user!.role !== 'admin') {
        return response.forbidden({ message: 'No tienes permisos de administrador' })
      }

      const userId = params.id
      const user = await User.findOrFail(userId)
      
      // No permitir auto-eliminación
      if (user.id === auth.user!.id) {
        return response.badRequest({ message: 'No puedes eliminarte a ti mismo' })
      }

      await user.delete()
      
      return response.ok({ message: 'Usuario eliminado exitosamente' })
    } catch (error) {
      console.error('Error en destroy:', error)
      if (error.code === 'E_ROW_NOT_FOUND') {
        return response.notFound({ message: 'Usuario no encontrado' })
      }
      return response.internalServerError({ message: 'Error al eliminar usuario' })
    }
  }
}