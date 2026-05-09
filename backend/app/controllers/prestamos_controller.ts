import type { HttpContext } from '@adonisjs/core/http'
import Prestamo from '#models/prestamo'
import Lote from '#models/lote'
import ApiToken from '#models/api_token'
import { registrarActividad } from '../helpers/registrar_actividad.js'
import { DateTime } from 'luxon'
import { aplicarAbonoAVenta } from '../services/abonos_ventas_service.js'
import { createVentaValidator, updateVentaValidator } from '#validators/ventas_validator'
import { cleanEmptyStrings, isValidationError, validationMessages } from '#validators/helpers'

export default class PrestamosController {
  private async verifyToken(token: string) {
    if (!token) return null
    const apiToken = await ApiToken.query()
      .where('token', token.replace('Bearer ', ''))
      .preload('user')
      .first()
    return apiToken?.user || null
  }

  private fechaDesdeIso(fecha?: string | null) {
    return fecha ? DateTime.fromISO(fecha, { zone: 'America/Guatemala' }) : null
  }

  private async resolverLote(data: {
    numeroLote?: string
    medidaLote?: string
    areaLote?: string
  }) {
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

      const data = await createVentaValidator.validate(
        cleanEmptyStrings(request.all(), ['medidaLote', 'areaLote', 'fechaCobro', 'enganche'])
      )

      const lote = await this.resolverLote(data)
      const enganche = Number(data.enganche || 0)

      if (enganche < 0) {
        return response.badRequest({ message: 'El enganche no puede ser negativo' })
      }

      if (enganche - Number(data.monto) > 0.01) {
        return response.badRequest({ message: 'El enganche no puede exceder el precio del lote' })
      }

      const prestamo = await Prestamo.create({
        clienteId: data.clienteId,
        loteId: lote?.id || null,
        monto: data.monto,
        cuotas: data.cuotas,
        fechaInicio: this.fechaDesdeIso(data.fechaInicio)!,
        fechaFin: this.fechaDesdeIso(data.fechaFin)!,
        frecuenciaPago: data.frecuenciaPago || 'mensual',
        fechaCobro: this.fechaDesdeIso(data.fechaCobro),
        estado: 'activo',
      })
      await prestamo.load('cliente')
      await prestamo.load('lote')

      let resultadoEnganche = null
      if (enganche > 0) {
        resultadoEnganche = await aplicarAbonoAVenta({
          ventaId: prestamo.id,
          monto: enganche,
          fechaPago: data.fechaInicio,
          usuarioId: user.id,
          tipoPago: 'enganche',
        })
        await prestamo.load('pagos')
      }

      await registrarActividad({
        usuarioId: user.id,
        tipo: 'crear',
        entidad: 'prestamo',
        entidadId: prestamo.id,
        descripcion: `Creo venta del lote ${prestamo.numeroLote || 'N/A'} por Q${prestamo.monto} para ${prestamo.cliente.nombres} ${prestamo.cliente.apellidos}${enganche > 0 ? ` con enganche de Q${enganche}` : ''}`,
        detalle: {
          monto: prestamo.monto,
          cuotas: prestamo.cuotas,
          numeroLote: prestamo.numeroLote,
          enganche,
        },
      })

      return response.created({
        message:
          enganche > 0
            ? 'Venta creada exitosamente con enganche registrado'
            : 'Venta creada exitosamente',
        prestamo,
        enganche: resultadoEnganche,
      })
    } catch (error) {
      if (isValidationError(error)) {
        return response.badRequest({
          message: 'Datos invalidos para crear venta',
          errors: validationMessages(error),
        })
      }

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

      const data = await updateVentaValidator.validate(
        cleanEmptyStrings(request.only(camposPermitidos), ['medidaLote', 'areaLote', 'fechaCobro'])
      )
      const lote = await this.resolverLote(data)

      prestamo.merge({
        monto: data.monto ?? prestamo.monto,
        cuotas: data.cuotas ?? prestamo.cuotas,
        fechaInicio: this.fechaDesdeIso(data.fechaInicio) ?? prestamo.fechaInicio,
        fechaFin: this.fechaDesdeIso(data.fechaFin) ?? prestamo.fechaFin,
        frecuenciaPago: data.frecuenciaPago ?? prestamo.frecuenciaPago,
        fechaCobro:
          data.fechaCobro === undefined ? prestamo.fechaCobro : this.fechaDesdeIso(data.fechaCobro),
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
      if (isValidationError(error)) {
        return response.badRequest({
          message: 'Datos invalidos para actualizar venta',
          errors: validationMessages(error),
        })
      }

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
