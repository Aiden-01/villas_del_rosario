import type { HttpContext } from '@adonisjs/core/http'
import Prestamo from '#models/prestamo'
import ApiToken from '#models/api_token'
import { registrarActividad } from '../helpers/registrar_actividad.js'
import { DateTime } from 'luxon'

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

      const { clienteId, mostrarAntiguos } = request.qs()
      const query = Prestamo.query().preload('cliente').preload('pagos')

      if (clienteId) {
        query.where('cliente_id', clienteId)
      }

      if (!mostrarAntiguos) {
        const hace6Meses = DateTime.now()
          .setZone('America/Guatemala')
          .minus({ months: 6 })
          .toISODate()

        query.where((q) => {
          q.where('estado', '!=', 'cancelado').orWhere((q2) => {
            q2.where('estado', 'cancelado').where('fecha_fin', '>=', hace6Meses!)
          })
        })
      }

      const prestamos = await query
      return response.ok(prestamos)
    } catch (error) {
      console.error(error)
      return response.internalServerError({ message: 'Error al obtener ventas' })
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
        .preload('pagos')
        .first()

      if (!prestamo) return response.notFound({ message: 'Venta no encontrada' })
      return response.ok(prestamo)
    } catch (error) {
      console.error(error)
      return response.internalServerError({ message: 'Error al obtener venta' })
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
        .preload('pagos')
      return response.ok(prestamos)
    } catch (error) {
      console.error(error)
      return response.internalServerError({ message: 'Error al obtener ventas del cliente' })
    }
  }

  async store({ request, response }: HttpContext) {
    try {
      const authHeader = request.header('authorization')
      const user = await this.verifyToken(authHeader || '')
      if (!user) return response.forbidden({ message: 'No autorizado' })

      const data = request.only([
        'clienteId', 'monto', 'interes', 'cuotas',
        'fechaInicio', 'fechaFin', 'frecuenciaPago',
        'numeroLote', 'medidaLote', 'areaLote',
        'fechaCobro',
      ])

      if (
        !data.clienteId ||
        !data.monto ||
        !data.cuotas ||
        !data.fechaInicio ||
        !data.fechaFin ||
        !data.numeroLote
      ) {
        return response.badRequest({ message: 'Cliente, lote, precio, cuotas y fechas son obligatorios' })
      }

      const prestamo = await Prestamo.create({
        ...data,
        interes: 0,
        frecuenciaPago: data.frecuenciaPago || 'mensual',
        tipoCobro: 'manual',
        ultimoPagoAutomatico: null,
        estado: 'activo',
      })
      await prestamo.load('cliente')

      await registrarActividad({
        usuarioId: user.id,
        tipo: 'crear',
        entidad: 'prestamo',
        entidadId: prestamo.id,
        descripcion: `Creo venta del lote ${prestamo.numeroLote || 'N/A'} por Q${prestamo.monto} para ${prestamo.cliente.nombres} ${prestamo.cliente.apellidos}`,
        detalle: {
          monto: prestamo.monto,
          cuotas: prestamo.cuotas,
          numeroLote: prestamo.numeroLote,
          tipoCobro: 'manual',
        },
      })

      return response.created({ message: 'Venta creada exitosamente', prestamo })
    } catch (error) {
      console.error(error)
      return response.internalServerError({ message: 'Error al crear venta' })
    }
  }

  async update({ request, params, response }: HttpContext) {
    try {
      const authHeader = request.header('authorization')
      const user = await this.verifyToken(authHeader || '')
      if (!user) return response.forbidden({ message: 'No autorizado' })

      const prestamo = await Prestamo.findOrFail(params.id)

      const camposPermitidos = [
        'monto', 'interes', 'cuotas', 'fechaInicio', 'fechaFin', 'frecuenciaPago',
        'numeroLote', 'medidaLote', 'areaLote', 'fechaCobro',
      ]
      if (user.role === 'admin') camposPermitidos.push('estado')

      const data = request.only(camposPermitidos)
      if ('interes' in data) data.interes = 0
      data.tipoCobro = 'manual'
      data.ultimoPagoAutomatico = null

      prestamo.merge(data)
      await prestamo.save()
      await prestamo.load('cliente')

      await registrarActividad({
        usuarioId: user.id,
        tipo: 'actualizar',
        entidad: 'prestamo',
        entidadId: prestamo.id,
        descripcion: `Actualizo venta del lote ${prestamo.numeroLote || 'N/A'} de ${prestamo.cliente.nombres} ${prestamo.cliente.apellidos} - estado: ${prestamo.estado}`,
      })

      return response.ok({ message: 'Venta actualizada exitosamente', prestamo })
    } catch (error) {
      console.error(error)
      return response.internalServerError({ message: 'Error al actualizar venta' })
    }
  }

  async destroy({ request, params, response }: HttpContext) {
    try {
      const authHeader = request.header('authorization')
      const user = await this.verifyToken(authHeader || '')
      if (!user) return response.forbidden({ message: 'No autorizado' })

      if (user.role !== 'admin') {
        return response.forbidden({ message: 'Solo el administrador puede eliminar ventas' })
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
        descripcion: `Elimino venta de ${desc}`,
      })

      return response.ok({ message: 'Venta eliminada exitosamente' })
    } catch (error) {
      console.error(error)
      return response.internalServerError({ message: 'Error al eliminar venta' })
    }
  }
}
