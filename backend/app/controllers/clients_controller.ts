import type { HttpContext } from '@adonisjs/core/http'
import Client from '#models/client'
import ApiToken from '#models/api_token'
import { registrarActividad } from '../helpers/registrar_actividad.js'

export default class ClientsController {
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
      if (!user) return response.forbidden({ message: 'No autorizado' })

      const clients = await Client.query().orderBy('nombres', 'asc').orderBy('apellidos', 'asc')
      return response.ok(clients)
    } catch (error) {
      console.error(error)
      return response.internalServerError({ message: 'Error al obtener clientes' })
    }
  }

  async store({ request, response }: HttpContext) {
    try {
      const authHeader = request.header('authorization')
      const user = await this.verifyToken(authHeader || '')
      if (!user) return response.forbidden({ message: 'No autorizado' })

      const data = request.only(['nombres', 'apellidos', 'telefono', 'direccion', 'zona'])

      if (!data.nombres || !data.apellidos || !data.telefono || !data.direccion) {
        return response.badRequest({ message: 'Todos los campos son obligatorios' })
      }

      const newClient = await Client.create(data)

      await registrarActividad({
        usuarioId: user.id,
        tipo: 'crear',
        entidad: 'cliente',
        entidadId: newClient.id,
        descripcion: `Creo el cliente ${newClient.nombres} ${newClient.apellidos}`,
        detalle: { telefono: newClient.telefono, direccion: newClient.direccion },
      })

      return response.created({ message: 'Cliente creado exitosamente', client: newClient })
    } catch (error) {
      console.error(error)
      return response.internalServerError({ message: 'Error al crear cliente' })
    }
  }

  async update({ request, params, response }: HttpContext) {
    try {
      const authHeader = request.header('authorization')
      const user = await this.verifyToken(authHeader || '')
      if (!user) return response.forbidden({ message: 'No autorizado' })

      const client = await Client.findOrFail(params.id)
      const data = request.only(['nombres', 'apellidos', 'telefono', 'direccion', 'zona'])

      client.merge(data)
      await client.save()

      await registrarActividad({
        usuarioId: user.id,
        tipo: 'actualizar',
        entidad: 'cliente',
        entidadId: client.id,
        descripcion: `Actualizo el cliente ${client.nombres} ${client.apellidos}`,
      })

      return response.ok({ message: 'Cliente actualizado exitosamente', client })
    } catch (error) {
      console.error(error)
      return response.internalServerError({ message: 'Error al actualizar cliente' })
    }
  }

  async destroy({ request, params, response }: HttpContext) {
    try {
      const authHeader = request.header('authorization')
      const user = await this.verifyToken(authHeader || '')
      if (!user) return response.forbidden({ message: 'No autorizado' })

      if (user.role !== 'admin') {
        return response.forbidden({ message: 'Solo el administrador puede eliminar clientes' })
      }

      const client = await Client.findOrFail(params.id)
      const nombre = `${client.nombres} ${client.apellidos}`
      await client.delete()

      await registrarActividad({
        usuarioId: user.id,
        tipo: 'eliminar',
        entidad: 'cliente',
        entidadId: Number(params.id),
        descripcion: `Elimino el cliente ${nombre}`,
      })

      return response.ok({ message: 'Cliente eliminado exitosamente' })
    } catch (error) {
      console.error(error)
      return response.internalServerError({ message: 'Error al eliminar cliente' })
    }
  }

  async show({ request, params, response }: HttpContext) {
    try {
      const authHeader = request.header('authorization')
      const user = await this.verifyToken(authHeader || '')
      if (!user) return response.forbidden({ message: 'No autorizado' })

      const client = await Client.query().where('id', params.id).first()

      if (!client) return response.notFound({ message: 'Cliente no encontrado' })
      return response.ok(client)
    } catch (error) {
      console.error(error)
      return response.internalServerError({ message: 'Error al obtener cliente' })
    }
  }
}
