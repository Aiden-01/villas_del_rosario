import type { HttpContext } from '@adonisjs/core/http'
import Actividad from '#models/actividad'
import ApiToken from '#models/api_token'

export default class ActividadesController {
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

      const { page = 1, limit = 50, entidad, tipo } = request.qs()

      const query = Actividad.query().preload('usuario').orderBy('created_at', 'desc')

      if (entidad) query.where('entidad', entidad)
      if (tipo) query.where('tipo', tipo)

      const actividades = await query
        .limit(Number(limit))
        .offset((Number(page) - 1) * Number(limit))

      return response.ok(actividades)
    } catch (error) {
      console.error(error)
      return response.internalServerError({ message: 'Error al obtener historial' })
    }
  }
}
