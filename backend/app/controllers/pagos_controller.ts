import type { HttpContext } from '@adonisjs/core/http'
import Pago from '#models/pago'
import ApiToken from '#models/api_token'

export default class PagosController {

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
   * Listar todos los pagos
   */
  async index({ request, response }: HttpContext) {
    try {
      const authHeader = request.header('authorization')
      const user = await this.verifyToken(authHeader || '')

      if (!user) {
        return response.forbidden({ message: 'No autorizado' })
      }

      const pagos = await Pago.query()
        .preload('prestamo', (q) => q.preload('cliente'))
        .preload('usuario')

      return response.ok(pagos)
    } catch (error) {
      console.error(error)
      return response.internalServerError({ message: 'Error al obtener pagos' })
    }
  }

  /**
   * Listar pagos de un préstamo específico
   */
  async byPrestamo({ request, params, response }: HttpContext) {
    try {
      const authHeader = request.header('authorization')
      const user = await this.verifyToken(authHeader || '')

      if (!user) {
        return response.forbidden({ message: 'No autorizado' })
      }

      const pagos = await Pago.query()
        .where('prestamo_id', params.prestamoId)
        .preload('prestamo', (q) => q.preload('cliente'))
        .preload('usuario')
        .orderBy('numero_cuota', 'asc')

      return response.ok(pagos)
    } catch (error) {
      console.error(error)
      return response.internalServerError({ message: 'Error al obtener pagos del préstamo' })
    }
  }

  /**
   * Registrar pago
   */
  async store({ request, response }: HttpContext) {
    try {
      const authHeader = request.header('authorization')
      const user = await this.verifyToken(authHeader || '')

      if (!user) {
        return response.forbidden({ message: 'No autorizado' })
      }

      const data = request.only([
        'prestamoId',
        'numeroCuota',
        'montoPagado',
        'fechaPago',
      ])

      if (!data.prestamoId || !data.numeroCuota || !data.montoPagado || !data.fechaPago) {
        return response.badRequest({ message: 'Todos los campos son obligatorios' })
      }

      // Verificar que no se haya pagado ya esa cuota
      const cuotaExistente = await Pago.query()
        .where('prestamo_id', data.prestamoId)
        .where('numero_cuota', data.numeroCuota)
        .first()

      if (cuotaExistente) {
        return response.conflict({ message: `La cuota #${data.numeroCuota} ya fue registrada` })
      }

      // Tomar el usuario del token automáticamente
      const pago = await Pago.create({
        ...data,
        usuarioId: user.id,
      })

      await pago.load('prestamo', (q) => q.preload('cliente'))
      await pago.load('usuario')

      return response.created({
        message: 'Pago registrado exitosamente',
        pago,
      })
    } catch (error) {
      console.error(error)
      return response.internalServerError({ message: 'Error al registrar pago' })
    }
  }

  /**
   * Eliminar pago (solo admin)
   */
  async destroy({ request, params, response }: HttpContext) {
    try {
      const authHeader = request.header('authorization')
      const user = await this.verifyToken(authHeader || '')

      if (!user) {
        return response.forbidden({ message: 'No autorizado' })
      }

      if (user.role !== 'admin') {
        return response.forbidden({ message: 'Solo el administrador puede eliminar pagos' })
      }

      const pago = await Pago.findOrFail(params.id)
      await pago.delete()

      return response.ok({ message: 'Pago eliminado exitosamente' })
    } catch (error) {
      console.error(error)
      return response.internalServerError({ message: 'Error al eliminar pago' })
    }
  }
}