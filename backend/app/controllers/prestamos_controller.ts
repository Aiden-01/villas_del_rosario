import type { HttpContext } from '@adonisjs/core/http'
import Prestamo from '#models/prestamo'
import ApiToken from '#models/api_token'
import { registrarActividad } from '../helpers/registrar_actividad.js'

export default class PrestamosController {

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

      const prestamos = await Prestamo.query().preload('cliente')
      return response.ok(prestamos)
    } catch (error) {
      console.error(error)
      return response.internalServerError({ message: 'Error al obtener préstamos' })
    }
  }

  async show({ request, params, response }: HttpContext) {
    try {
      const authHeader = request.header('authorization')
      const user = await this.verifyToken(authHeader || '')
      if (!user) return response.forbidden({ message: 'No autorizado' })

      const prestamo = await Prestamo.query()
        .where('id', params.id)
        .preload('cliente')
        .first()

      if (!prestamo) return response.notFound({ message: 'Préstamo no encontrado' })
      return response.ok(prestamo)
    } catch (error) {
      console.error(error)
      return response.internalServerError({ message: 'Error al obtener préstamo' })
    }
  }

  async byCliente({ request, params, response }: HttpContext) {
    try {
      const authHeader = request.header('authorization')
      const user = await this.verifyToken(authHeader || '')
      if (!user) return response.forbidden({ message: 'No autorizado' })

      const prestamos = await Prestamo.query()
        .where('cliente_id', params.clienteId)
        .preload('cliente')
      return response.ok(prestamos)
    } catch (error) {
      console.error(error)
      return response.internalServerError({ message: 'Error al obtener préstamos del cliente' })
    }
  }

  async store({ request, response }: HttpContext) {
    try {
      const authHeader = request.header('authorization')
      const user = await this.verifyToken(authHeader || '')
      if (!user) return response.forbidden({ message: 'No autorizado' })

      const data = request.only([
        'clienteId', 'monto', 'interes', 'cuotas',
        'fechaInicio', 'fechaFin', 'estado', 'frecuenciaPago', 'diaVisita',
      ])

      if (!data.clienteId || !data.monto || !data.interes || !data.cuotas || !data.fechaInicio || !data.fechaFin) {
        return response.badRequest({ message: 'Todos los campos son obligatorios' })
      }

      const prestamo = await Prestamo.create(data)
      await prestamo.load('cliente')

      await registrarActividad({
        usuarioId: user.id,
        tipo: 'crear',
        entidad: 'prestamo',
        entidadId: prestamo.id,
        descripcion: `Creó préstamo de Q${prestamo.monto} para ${prestamo.cliente.nombres} ${prestamo.cliente.apellidos}`,
        detalle: { monto: prestamo.monto, cuotas: prestamo.cuotas, interes: prestamo.interes },
      })

      return response.created({ message: 'Préstamo creado exitosamente', prestamo })
    } catch (error) {
      console.error(error)
      return response.internalServerError({ message: 'Error al crear préstamo' })
    }
  }

  async update({ request, params, response }: HttpContext) {
    try {
      const authHeader = request.header('authorization')
      const user = await this.verifyToken(authHeader || '')
      if (!user) return response.forbidden({ message: 'No autorizado' })

      const prestamo = await Prestamo.findOrFail(params.id)
      const data = request.only([
        'monto', 'interes', 'cuotas', 'fechaInicio',
        'fechaFin', 'estado', 'frecuenciaPago', 'diaVisita',
      ])

      prestamo.merge(data)
      await prestamo.save()
      await prestamo.load('cliente')

      await registrarActividad({
        usuarioId: user.id,
        tipo: 'actualizar',
        entidad: 'prestamo',
        entidadId: prestamo.id,
        descripcion: `Actualizó préstamo de ${prestamo.cliente.nombres} ${prestamo.cliente.apellidos} — estado: ${prestamo.estado}`,
      })

      return response.ok({ message: 'Préstamo actualizado exitosamente', prestamo })
    } catch (error) {
      console.error(error)
      return response.internalServerError({ message: 'Error al actualizar préstamo' })
    }
  }

  async destroy({ request, params, response }: HttpContext) {
    try {
      const authHeader = request.header('authorization')
      const user = await this.verifyToken(authHeader || '')
      if (!user) return response.forbidden({ message: 'No autorizado' })

      if (user.role !== 'admin') {
        return response.forbidden({ message: 'Solo el administrador puede eliminar préstamos' })
      }

      const prestamo = await Prestamo.findOrFail(params.id)
      await prestamo.load('cliente')
      const desc = `${prestamo.cliente.nombres} ${prestamo.cliente.apellidos}`
      await prestamo.delete()

      await registrarActividad({
        usuarioId: user.id,
        tipo: 'eliminar',
        entidad: 'prestamo',
        entidadId: Number(params.id),
        descripcion: `Eliminó préstamo de ${desc}`,
      })

      return response.ok({ message: 'Préstamo eliminado exitosamente' })
    } catch (error) {
      console.error(error)
      return response.internalServerError({ message: 'Error al eliminar préstamo' })
    }
  }
}