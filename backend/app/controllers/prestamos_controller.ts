import type { HttpContext } from '@adonisjs/core/http'
import Prestamo from '#models/prestamo'
import Lote from '#models/lote'
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

  private async resolverLote(data: { numeroLote?: string; medidaLote?: string; areaLote?: string }) {
    const numero = data.numeroLote?.trim()
    if (!numero) return null

    const lote = await Lote.firstOrCreate(
      { numero },
      {
        numero,
        medida: data.medidaLote?.trim() || null,
        area: data.areaLote?.trim() || null,
        estado: 'disponible',
      }
    )

    lote.merge({
      medida: data.medidaLote?.trim() || lote.medida || null,
      area: data.areaLote?.trim() || lote.area || null,
      estado: 'vendido',
    })
    await lote.save()

    return lote
  }

  async index({ request, response }: HttpContext) {
    try {
      const authHeader = request.header('authorization')
      const user = await this.verifyToken(authHeader || '')
      if (!user) return response.forbidden({ message: 'No autorizado' })

      const { clienteId, mostrarAntiguos } = request.qs()
      const query = Prestamo.query().preload('cliente').preload('pagos').preload('lote')

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
        .preload('lote')
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
        .preload('lote')
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
        'clienteId',
        'monto',
        'cuotas',
        'fechaInicio',
        'fechaFin',
        'frecuenciaPago',
        'numeroLote',
        'medidaLote',
        'areaLote',
        'fechaCobro',
      ])

      if (!data.clienteId || !data.monto || !data.cuotas || !data.fechaInicio || !data.fechaFin || !data.numeroLote) {
        return response.badRequest({ message: 'Cliente, lote, precio, cuotas y fechas son obligatorios' })
      }

      const lote = await this.resolverLote(data)

      const prestamo = await Prestamo.create({
        clienteId: data.clienteId,
        loteId: lote?.id || null,
        monto: data.monto,
        cuotas: data.cuotas,
        fechaInicio: data.fechaInicio,
        fechaFin: data.fechaFin,
        frecuenciaPago: data.frecuenciaPago || 'mensual',
        fechaCobro: data.fechaCobro || null,
        estado: 'activo',
      })
      await prestamo.load('cliente')
      await prestamo.load('lote')

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
        'monto',
        'cuotas',
        'fechaInicio',
        'fechaFin',
        'frecuenciaPago',
        'numeroLote',
        'medidaLote',
        'areaLote',
        'fechaCobro',
      ]
      if (user.role === 'admin') camposPermitidos.push('estado')

      const data = request.only(camposPermitidos)
      const lote = await this.resolverLote(data)

      prestamo.merge({
        monto: data.monto ?? prestamo.monto,
        cuotas: data.cuotas ?? prestamo.cuotas,
        fechaInicio: data.fechaInicio ?? prestamo.fechaInicio,
        fechaFin: data.fechaFin ?? prestamo.fechaFin,
        frecuenciaPago: data.frecuenciaPago ?? prestamo.frecuenciaPago,
        fechaCobro: data.fechaCobro ?? prestamo.fechaCobro,
        estado: data.estado ?? prestamo.estado,
        loteId: lote?.id ?? prestamo.loteId,
      })
      await prestamo.save()
      await prestamo.load('cliente')
      await prestamo.load('lote')

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
      await prestamo.load('lote')

      if (prestamo.loteId) {
        const lote = await Lote.find(prestamo.loteId)
        if (lote) {
          lote.estado = 'disponible'
          await lote.save()
        }
      }

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
