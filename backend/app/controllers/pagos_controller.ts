import type { HttpContext } from '@adonisjs/core/http'
import Pago from '#models/pago'
import Prestamo from '#models/prestamo'
import ApiToken from '#models/api_token'
import { registrarActividad } from '../helpers/registrar_actividad.js'

export default class PagosController {
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

      const pagos = await Pago.query()
        .preload('prestamo', (q) => q.preload('cliente'))
        .preload('usuario')
      return response.ok(pagos)
    } catch (error) {
      console.error(error)
      return response.internalServerError({ message: 'Error al obtener pagos' })
    }
  }

  async byPrestamo({ request, params, response }: HttpContext) {
    try {
      const authHeader = request.header('authorization')
      const user = await this.verifyToken(authHeader || '')
      if (!user) return response.forbidden({ message: 'No autorizado' })

      const pagos = await Pago.query()
        .where('prestamo_id', params.prestamoId)
        .preload('prestamo', (q) => q.preload('cliente'))
        .preload('usuario')
        .orderBy('numero_cuota', 'asc')
      return response.ok(pagos)
    } catch (error) {
      console.error(error)
      return response.internalServerError({ message: 'Error al obtener pagos de la venta' })
    }
  }

  async store({ request, response }: HttpContext) {
    try {
      const authHeader = request.header('authorization')
      const user = await this.verifyToken(authHeader || '')
      if (!user) return response.forbidden({ message: 'No autorizado' })

      const data = request.only([
        'prestamoId', 'numeroCuota', 'montoPagado', 'fechaPago',
      ])

      if (!data.prestamoId || !data.numeroCuota || !data.montoPagado || !data.fechaPago) {
        return response.badRequest({ message: 'Todos los campos son obligatorios' })
      }

      const cuotaExistente = await Pago.query()
        .where('prestamo_id', data.prestamoId)
        .where('numero_cuota', data.numeroCuota)
        .first()

      if (cuotaExistente) {
        return response.conflict({ message: `La cuota #${data.numeroCuota} ya fue registrada` })
      }

      const pago = await Pago.create({ ...data, usuarioId: user.id })
      await pago.load('prestamo', (q) => q.preload('cliente'))
      await pago.load('usuario')

      const prestamo = await Prestamo.findOrFail(data.prestamoId)
      if (data.numeroCuota >= prestamo.cuotas) {
        prestamo.estado = 'pagado'
        await prestamo.save()

        await registrarActividad({
          usuarioId: user.id,
          tipo: 'actualizar',
          entidad: 'prestamo',
          entidadId: prestamo.id,
          descripcion: `Venta del lote ${pago.prestamo.numeroLote || 'N/A'} marcada como pagada`,
        })
      }

      await registrarActividad({
        usuarioId: user.id,
        tipo: 'pago',
        entidad: 'pago',
        entidadId: pago.id,
        descripcion: `Registro cuota #${pago.numeroCuota} de Q${pago.montoPagado} - lote ${pago.prestamo.numeroLote || 'N/A'} / ${pago.prestamo.cliente.nombres} ${pago.prestamo.cliente.apellidos}`,
        detalle: { numeroCuota: pago.numeroCuota, montoPagado: pago.montoPagado },
      })

      return response.created({ message: 'Pago registrado exitosamente', pago })
    } catch (error) {
      console.error(error)
      return response.internalServerError({ message: 'Error al registrar pago' })
    }
  }

  async destroy({ request, params, response }: HttpContext) {
    try {
      const authHeader = request.header('authorization')
      const user = await this.verifyToken(authHeader || '')
      if (!user) return response.forbidden({ message: 'No autorizado' })

      if (user.role !== 'admin') {
        return response.forbidden({ message: 'Solo el administrador puede eliminar pagos' })
      }

      const pago = await Pago.findOrFail(params.id)
      await pago.delete()

      await registrarActividad({
        usuarioId: user.id,
        tipo: 'eliminar',
        entidad: 'pago',
        entidadId: Number(params.id),
        descripcion: `Elimino el pago #${params.id}`,
      })

      return response.ok({ message: 'Pago eliminado exitosamente' })
    } catch (error) {
      console.error(error)
      return response.internalServerError({ message: 'Error al eliminar pago' })
    }
  }
}
