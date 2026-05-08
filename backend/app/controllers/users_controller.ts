import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'
import ApiToken from '#models/api_token'
import { registrarActividad } from '../helpers/registrar_actividad.js'

export default class UsersController {
  private async verifyToken(token: string) {
    if (!token) return null
    const apiToken = await ApiToken.query()
      .where('token', token.replace('Bearer ', ''))
      .preload('user')
      .first()
    return apiToken?.user || null
  }

  async index({ request, response }: HttpContext) {
    try {
      const authHeader = request.header('authorization')
      const user = await this.verifyToken(authHeader || '')
      if (!user || user.role !== 'admin') {
        return response.forbidden({ message: 'No tienes permisos' })
      }

      const users = await User.query().select(
        'id',
        'name',
        'username',
        'email',
        'role',
        'createdAt'
      )
      return response.ok(users)
    } catch (error) {
      console.error('Error:', error)
      return response.internalServerError({ message: 'Error al obtener usuarios' })
    }
  }

  async store({ request, response }: HttpContext) {
    try {
      const authHeader = request.header('authorization')
      const user = await this.verifyToken(authHeader || '')
      if (!user || user.role !== 'admin') {
        return response.forbidden({ message: 'No tienes permisos' })
      }

      const data = request.only(['name', 'email', 'username', 'password', 'role'])

      if (!['admin', 'trabajador'].includes(data.role)) {
        return response.badRequest({ message: 'Rol inválido' })
      }

      const existingUser = await User.findBy('username', data.username)
      if (existingUser) {
        return response.conflict({ message: 'El usuario ya existe' })
      }

      const newUser = await User.create(data)

      await registrarActividad({
        usuarioId: user.id,
        tipo: 'crear',
        entidad: 'usuario',
        entidadId: newUser.id,
        descripcion: `Creó el usuario @${newUser.username} con rol ${newUser.role}`,
      })

      return response.created({
        message: 'Usuario creado exitosamente',
        user: {
          id: newUser.id,
          name: newUser.name,
          username: newUser.username,
          email: newUser.email,
          role: newUser.role,
          createdAt: newUser.createdAt,
        },
      })
    } catch (error) {
      console.error('Error:', error)
      return response.internalServerError({ message: 'Error al crear usuario' })
    }
  }

  async destroy({ request, params, response }: HttpContext) {
    try {
      const authHeader = request.header('authorization')
      const user = await this.verifyToken(authHeader || '')
      if (!user || user.role !== 'admin') {
        return response.forbidden({ message: 'No tienes permisos' })
      }

      const userToDelete = await User.findOrFail(params.id)

      if (userToDelete.id === user.id) {
        return response.badRequest({ message: 'No puedes eliminarte a ti mismo' })
      }

      const username = userToDelete.username
      await userToDelete.delete()

      await registrarActividad({
        usuarioId: user.id,
        tipo: 'eliminar',
        entidad: 'usuario',
        entidadId: Number(params.id),
        descripcion: `Eliminó el usuario @${username}`,
      })

      return response.ok({ message: 'Usuario eliminado exitosamente' })
    } catch (error) {
      console.error('Error:', error)
      return response.internalServerError({ message: 'Error al eliminar usuario' })
    }
  }
}
