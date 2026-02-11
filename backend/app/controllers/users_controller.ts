// app/controllers/users_controller.ts
import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'
import ApiToken from '#models/api_token'

export default class UsersController {
  /**
   * Verificar token manualmente
   */
  private async verifyToken(token: string) {
    if (!token) return null
    
    const apiToken = await ApiToken.query()
      .where('token', token.replace('Bearer ', ''))
      .preload('user')
      .first()
    
    return apiToken?.user || null
  }

  /**
   * Listar usuarios
   */
  async index({ request, response }: HttpContext) {
    try {
      // Verificar token manualmente
      const authHeader = request.header('authorization')
      const user = await this.verifyToken(authHeader || '')
      
      if (!user || user.role !== 'admin') {
        return response.forbidden({ message: 'No tienes permisos' })
      }

      const users = await User.query().select('id', 'name', 'username', 'email', 'role', 'createdAt')
      return response.ok(users)
    } catch (error) {
      console.error('Error:', error)
      return response.internalServerError({ message: 'Error al obtener usuarios' })
    }
  }

  /**
   * Crear usuario
   */
  async store({ request, response }: HttpContext) {
    try {
      // Verificar token manualmente
      const authHeader = request.header('authorization')
      const user = await this.verifyToken(authHeader || '')
      
      if (!user || user.role !== 'admin') {
        return response.forbidden({ message: 'No tienes permisos' })
      }

      const data = request.only(['name', 'email', 'username', 'password', 'role'])
      
      // Validaciones
      if (!['admin', 'trabajador'].includes(data.role)) {
        return response.badRequest({ message: 'Rol inválido' })
      }

      // Verificar si el usuario ya existe
      const existingUser = await User.findBy('username', data.username)
      if (existingUser) {
        return response.conflict({ message: 'El usuario ya existe' })
      }

      const newUser = await User.create(data)
      
      return response.created({
        message: 'Usuario creado exitosamente',
        user: {
          id: newUser.id,
          name: newUser.name,
          username: newUser.username,
          email: newUser.email,
          role: newUser.role,
          createdAt: newUser.createdAt
        }
      })
    } catch (error) {
      console.error('Error:', error)
      return response.internalServerError({ message: 'Error al crear usuario' })
    }
  }

  /**
   * Eliminar usuario
   */
  async destroy({ request, params, response }: HttpContext) {
    try {
      // Verificar token manualmente
      const authHeader = request.header('authorization')
      const user = await this.verifyToken(authHeader || '')
      
      if (!user || user.role !== 'admin') {
        return response.forbidden({ message: 'No tienes permisos' })
      }

      const userId = params.id
      const userToDelete = await User.findOrFail(userId)
      
      // No permitir auto-eliminación
      if (userToDelete.id === user.id) {
        return response.badRequest({ message: 'No puedes eliminarte a ti mismo' })
      }

      await userToDelete.delete()
      
      return response.ok({ message: 'Usuario eliminado exitosamente' })
    } catch (error) {
      console.error('Error:', error)
      return response.internalServerError({ message: 'Error al eliminar usuario' })
    }
  }
}