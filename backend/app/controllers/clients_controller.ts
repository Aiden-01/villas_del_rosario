// app/controllers/clients_controller.ts
import type { HttpContext } from '@adonisjs/core/http'
import Client from '#models/client'
import ApiToken from '#models/api_token'

export default class ClientsController {

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
   * Listar clientes
   */
  async index({ request, response }: HttpContext) {
    try {
      const authHeader = request.header('authorization')
      const user = await this.verifyToken(authHeader || '')

      if (!user) {
        return response.forbidden({ message: 'No autorizado' })
      }

      const clients = await Client.all()
      return response.ok(clients)

    } catch (error) {
      console.error(error)
      return response.internalServerError({ message: 'Error al obtener clientes' })
    }
  }

  /**
   * Crear cliente
   */
  async store({ request, response }: HttpContext) {
    try {
      const authHeader = request.header('authorization')
      const user = await this.verifyToken(authHeader || '')

      if (!user) {
        return response.forbidden({ message: 'No autorizado' })
      }

      const data = request.only([
        'dpi',
        'nombres',
        'apellidos',
        'telefono',
        'direccion'
      ])

      if (!data.dpi || !data.nombres || !data.apellidos || !data.telefono || !data.direccion) {
        return response.badRequest({ message: 'Todos los campos son obligatorios' })
      }

      const existingClient = await Client.findBy('dpi', data.dpi)
      if (existingClient) {
        return response.conflict({ message: 'El DPI ya está registrado' })
      }

      const newClient = await Client.create(data)

      return response.created({
        message: 'Cliente creado exitosamente',
        client: newClient
      })

    } catch (error) {
      console.error(error)
      return response.internalServerError({ message: 'Error al crear cliente' })
    }
  }

  /**
   * Actualizar cliente
   */
  async update({ request, params, response }: HttpContext) {
    try {
      const authHeader = request.header('authorization')
      const user = await this.verifyToken(authHeader || '')

      if (!user) {
        return response.forbidden({ message: 'No autorizado' })
      }

      const client = await Client.findOrFail(params.id)

      const data = request.only([
        'dpi',
        'nombres',
        'apellidos',
        'telefono',
        'direccion'
      ])

      client.merge(data)
      await client.save()

      return response.ok({
        message: 'Cliente actualizado exitosamente',
        client
      })

    } catch (error) {
      console.error(error)
      return response.internalServerError({ message: 'Error al actualizar cliente' })
    }
  }

  /**
   * Eliminar cliente (solo admin)
   */
  async destroy({ request, params, response }: HttpContext) {
    try {
      const authHeader = request.header('authorization')
      const user = await this.verifyToken(authHeader || '')

      if (!user) {
        return response.forbidden({ message: 'No autorizado' })
      }

      // 🔥 Solo admin puede eliminar
      if (user.role !== 'admin') {
        return response.forbidden({ message: 'Solo el administrador puede eliminar clientes' })
      }

      const client = await Client.findOrFail(params.id)
      await client.delete()

      return response.ok({ message: 'Cliente eliminado exitosamente' })

    } catch (error) {
      console.error(error)
      return response.internalServerError({ message: 'Error al eliminar cliente' })
    }
  }
}