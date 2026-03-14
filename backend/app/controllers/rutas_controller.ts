import type { HttpContext } from '@adonisjs/core/http'
import Ruta from '#models/ruta'
import ApiToken from '#models/api_token'
import Prestamo from '#models/prestamo'
import { DateTime } from 'luxon'

export default class RutasController {

  private async verifyToken(token: string) {
    if (!token) return null
    const apiToken = await ApiToken.query()
      .where('token', token.replace('Bearer ', ''))
      .preload('user')
      .first()
    return apiToken?.user || null
  }

  // Listar todas las rutas
  async index({ request, response }: HttpContext) {
    try {
      const authHeader = request.header('authorization')
      const user = await this.verifyToken(authHeader || '')
      if (!user) return response.forbidden({ message: 'No autorizado' })

      const rutas = await Ruta.query().preload('trabajador')
      return response.ok(rutas)
    } catch (error) {
      return response.internalServerError({ message: 'Error al obtener rutas' })
    }
  }

  // Crear ruta
  async store({ request, response }: HttpContext) {
    try {
      const authHeader = request.header('authorization')
      const user = await this.verifyToken(authHeader || '')
      if (!user || user.role !== 'admin') return response.forbidden({ message: 'No autorizado' })

      const data = request.only(['nombre', 'descripcion', 'diaCobro', 'trabajadorId'])
      const ruta = await Ruta.create(data)
      return response.created({ message: 'Ruta creada exitosamente', ruta })
    } catch (error) {
      return response.internalServerError({ message: 'Error al crear ruta' })
    }
  }

  // Actualizar ruta
  async update({ request, params, response }: HttpContext) {
    try {
      const authHeader = request.header('authorization')
      const user = await this.verifyToken(authHeader || '')
      if (!user || user.role !== 'admin') return response.forbidden({ message: 'No autorizado' })

      const ruta = await Ruta.findOrFail(params.id)
      const data = request.only(['nombre', 'descripcion', 'diaCobro', 'trabajadorId'])
      ruta.merge(data)
      await ruta.save()
      return response.ok({ message: 'Ruta actualizada', ruta })
    } catch (error) {
      return response.internalServerError({ message: 'Error al actualizar ruta' })
    }
  }

  // Eliminar ruta
  async destroy({ request, params, response }: HttpContext) {
    try {
      const authHeader = request.header('authorization')
      const user = await this.verifyToken(authHeader || '')
      if (!user || user.role !== 'admin') return response.forbidden({ message: 'No autorizado' })

      const ruta = await Ruta.findOrFail(params.id)
      await ruta.delete()
      return response.ok({ message: 'Ruta eliminada' })
    } catch (error) {
      return response.internalServerError({ message: 'Error al eliminar ruta' })
    }
  }

  // ⭐ RUTA DEL DÍA — el corazón del módulo
  async rutaDelDia({ request, response }: HttpContext) {
    try {
      const authHeader = request.header('authorization')
      const user = await this.verifyToken(authHeader || '')
      if (!user) return response.forbidden({ message: 'No autorizado' })

      // Detectar qué día es hoy en español
      const diasSemana = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']
      const hoy = diasSemana[DateTime.now().weekday % 7]

      // Buscar préstamos activos cuyo día de visita es hoy
      const prestamos = await Prestamo.query()
        .where('estado', 'activo')
        .where('dia_visita', hoy)
        .preload('cliente')
        .preload('pagos')

      // Calcular cuota y cuántas ya pagaron
        const cobros = prestamos.map((prestamo) => {
        const cuotasSemana = prestamo.cuotas
        const montoTotal = Number(prestamo.monto) * (1 + Number(prestamo.interes) / 100)
        const montoCuota = Number((montoTotal / cuotasSemana).toFixed(2))
        const cuotasPagadas = prestamo.pagos.length
        const proximaCuota = cuotasPagadas + 1
        const yaPagoHoy = prestamo.pagos.some((p) => {
          const fechaPago = DateTime.fromJSDate(p.fechaPago as any).toISODate()
          const fechaHoy = DateTime.now().toISODate()
          return fechaPago === fechaHoy
        })

        return {
          prestamoId: prestamo.id,
          cliente: {
            id: prestamo.cliente.id,
            nombres: prestamo.cliente.nombres,
            apellidos: prestamo.cliente.apellidos,
            telefono: prestamo.cliente.telefono,
            direccion: prestamo.cliente.direccion,
            zona: prestamo.cliente.zona,
          },
          montoCuota,
          proximaCuota,
          cuotasPagadas,
          totalCuotas: cuotasSemana,
          yaPagoHoy,
          frecuenciaPago: prestamo.frecuenciaPago,
        }
      })

      const pendientes = cobros.filter((c) => !c.yaPagoHoy)
      const cobrados = cobros.filter((c) => c.yaPagoHoy)

      return response.ok({
        dia: hoy,
        fecha: DateTime.now().toISODate(),
        totalPendientes: pendientes.length,
        totalCobrados: cobrados.length,
        totalRecaudado: cobrados.reduce((sum, c) => sum + c.montoCuota, 0),
        pendientes,
        cobrados,
      })
    } catch (error) {
      console.error(error)
      return response.internalServerError({ message: 'Error al obtener ruta del día' })
    }
  }
}