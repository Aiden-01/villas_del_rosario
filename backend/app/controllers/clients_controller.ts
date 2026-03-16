import type { HttpContext } from '@adonisjs/core/http'
import Client from '#models/client'
import ApiToken from '#models/api_token'

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

      const clients = await Client.query()
        .preload('ruta')
        .orderBy('ruta_id', 'asc')
        .orderBy('orden_visita', 'asc')

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

      const data = request.only([
        'dpi', 'nombres', 'apellidos', 'telefono', 'direccion',
        'zona', 'rutaId', 'ordenVisita'
      ])

      if (!data.dpi || !data.nombres || !data.apellidos || !data.telefono || !data.direccion) {
        return response.badRequest({ message: 'Todos los campos son obligatorios' })
      }

      const existingClient = await Client.findBy('dpi', data.dpi)
      if (existingClient) {
        return response.conflict({ message: 'El DPI ya está registrado' })
      }

      const newClient = await Client.create(data)
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

      const data = request.only([
        'dpi', 'nombres', 'apellidos', 'telefono', 'direccion',
        'zona', 'rutaId', 'ordenVisita'
      ])

      client.merge(data)
      await client.save()

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
      await client.delete()

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

      const client = await Client.query()
        .where('id', params.id)
        .preload('ruta')
        .first()

      if (!client) return response.notFound({ message: 'Cliente no encontrado' })

      return response.ok(client)
    } catch (error) {
      console.error(error)
      return response.internalServerError({ message: 'Error al obtener cliente' })
    }
  }

  // Actualizar orden de múltiples clientes a la vez
  async actualizarOrdenes({ request, response }: HttpContext) {
    try {
      const authHeader = request.header('authorization')
      const user = await this.verifyToken(authHeader || '')
      if (!user) return response.forbidden({ message: 'No autorizado' })

      const { ordenes } = request.body()
      // ordenes = [{ id: 1, ordenVisita: 1 }, { id: 2, ordenVisita: 2 }...]

      for (const item of ordenes) {
        const client = await Client.find(item.id)
        if (client) {
          client.ordenVisita = item.ordenVisita
          await client.save()
        }
      }

      return response.ok({ message: 'Orden actualizado correctamente' })
    } catch (error) {
      console.error(error)
      return response.internalServerError({ message: 'Error al actualizar orden' })
    }
  }

  // Actualizar orden de múltiples rutas a la vez
  async actualizarOrdenRutas({ request, response }: HttpContext) {
    try {
      const authHeader = request.header('authorization')
      const user = await this.verifyToken(authHeader || '')
      if (!user) return response.forbidden({ message: 'No autorizado' })

      const { ordenes } = request.body()
      const Ruta = (await import('#models/ruta')).default

      for (const item of ordenes) {
        const ruta = await Ruta.find(item.id)
        if (ruta) {
          ruta.orden = item.orden
          await ruta.save()
        }
      }

      return response.ok({ message: 'Orden de rutas actualizado' })
    } catch (error) {
      console.error(error)
      return response.internalServerError({ message: 'Error al actualizar orden de rutas' })
    }
  }
}