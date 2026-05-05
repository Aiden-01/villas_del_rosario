import type { HttpContext } from '@adonisjs/core/http'
import Seguimiento from '#models/seguimiento'
import ApiToken from '#models/api_token'
import { registrarActividad } from '../helpers/registrar_actividad.js'

export default class SeguimientosController {

  private async verifyToken(token: string) {
    if (!token) return null
    const apiToken = await ApiToken.query()
      .where('token', token.replace('Bearer ', ''))
      .preload('user')
      .first()
    return apiToken?.user || null
  }

  // POST /api/seguimientos
  async store({ request, response }: HttpContext) {
    try {
      const user = await this.verifyToken(request.header('authorization') || '')
      if (!user) return response.forbidden({ message: 'No autorizado' })

      const data = request.only(['prestamoId', 'tipo', 'montoPagado', 'nota', 'fechaSeguimiento'])

      if (!data.prestamoId || !data.tipo || !data.fechaSeguimiento) {
        return response.badRequest({ message: 'prestamoId, tipo y fechaSeguimiento son obligatorios' })
      }

      if (!['no_pago', 'pago_parcial'].includes(data.tipo)) {
        return response.badRequest({ message: 'tipo debe ser no_pago o pago_parcial' })
      }

      const seguimiento = await Seguimiento.create({
        ...data,
        montoPagado: data.montoPagado || 0,
        resuelta: false,
        usuarioId: user.id,
      })

      await registrarActividad({
        usuarioId: user.id,
        tipo: 'crear',
        entidad: 'pago',
        entidadId: seguimiento.id,
        descripcion: `Registró seguimiento (${data.tipo}) para venta #${data.prestamoId} - próxima visita: ${data.fechaSeguimiento}`,
        detalle: { nota: data.nota, fechaSeguimiento: data.fechaSeguimiento },
      })

      return response.created({ message: 'Seguimiento registrado', seguimiento })
    } catch (error) {
      console.error(error)
      return response.internalServerError({ message: 'Error al registrar seguimiento' })
    }
  }

  // PUT /api/seguimientos/:id/resolver
  async resolver({ request, params, response }: HttpContext) {
    try {
      const user = await this.verifyToken(request.header('authorization') || '')
      if (!user) return response.forbidden({ message: 'No autorizado' })

      const seguimiento = await Seguimiento.findOrFail(params.id)
      seguimiento.resuelta = true
      await seguimiento.save()

      return response.ok({ message: 'Seguimiento resuelto', seguimiento })
    } catch (error) {
      console.error(error)
      return response.internalServerError({ message: 'Error al resolver seguimiento' })
    }
  }

  // GET /api/seguimientos/prestamo/:prestamoId
  async byPrestamo({ request, params, response }: HttpContext) {
    try {
      const user = await this.verifyToken(request.header('authorization') || '')
      if (!user) return response.forbidden({ message: 'No autorizado' })

      const seguimientos = await Seguimiento.query()
        .where('prestamo_id', params.prestamoId)
        .orderBy('fecha_seguimiento', 'desc')

      return response.ok(seguimientos)
    } catch (error) {
      console.error(error)
      return response.internalServerError({ message: 'Error al obtener seguimientos' })
    }
  }
}
