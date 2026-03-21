import type { HttpContext } from '@adonisjs/core/http'
import Ruta from '#models/ruta'
import ApiToken from '#models/api_token'
import Prestamo from '#models/prestamo'
import Seguimiento from '#models/seguimiento'
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

  async index({ request, response }: HttpContext) {
    try {
      const authHeader = request.header('authorization')
      const user = await this.verifyToken(authHeader || '')
      if (!user) return response.forbidden({ message: 'No autorizado' })

      const rutas = await Ruta.query()
        .preload('trabajador')
        .orderBy('orden', 'asc')
      return response.ok(rutas)
    } catch (error) {
      return response.internalServerError({ message: 'Error al obtener rutas' })
    }
  }

  async store({ request, response }: HttpContext) {
    try {
      const authHeader = request.header('authorization')
      const user = await this.verifyToken(authHeader || '')
      if (!user || user.role !== 'admin') return response.forbidden({ message: 'No autorizado' })

      const data = request.only(['nombre', 'descripcion', 'diaCobro', 'trabajadorId', 'orden'])
      const ruta = await Ruta.create(data)
      return response.created({ message: 'Ruta creada exitosamente', ruta })
    } catch (error) {
      return response.internalServerError({ message: 'Error al crear ruta' })
    }
  }

  async update({ request, params, response }: HttpContext) {
    try {
      const authHeader = request.header('authorization')
      const user = await this.verifyToken(authHeader || '')
      if (!user || user.role !== 'admin') return response.forbidden({ message: 'No autorizado' })

      const ruta = await Ruta.findOrFail(params.id)
      const data = request.only(['nombre', 'descripcion', 'diaCobro', 'trabajadorId', 'orden'])
      ruta.merge(data)
      await ruta.save()
      return response.ok({ message: 'Ruta actualizada', ruta })
    } catch (error) {
      return response.internalServerError({ message: 'Error al actualizar ruta' })
    }
  }

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

  async rutaDelDia({ request, response }: HttpContext) {
    try {
      const authHeader = request.header('authorization')
      const user = await this.verifyToken(authHeader || '')
      if (!user) return response.forbidden({ message: 'No autorizado' })

      const diasSemana: Record<number, string> = {
        1: 'lunes',
        2: 'martes',
        3: 'miercoles',
        4: 'jueves',
        5: 'viernes',
        6: 'sabado',
        7: 'domingo',
      }

      const ahora    = DateTime.now().setZone('America/Guatemala')
      const hoy      = diasSemana[ahora.weekday]
      const fechaHoy = ahora.toISODate()!

      // ── 1. Préstamos del día por ruta del cliente ─────────────────────────
      const prestamosPorRuta = await Prestamo.query()
        .where('prestamos.estado', 'activo')
        .preload('cliente', (q) => q.preload('ruta'))
        .preload('pagos')
        .join('clientes', 'prestamos.cliente_id', 'clientes.id')
        .join('rutas', 'clientes.ruta_id', 'rutas.id')
        .where('rutas.dia_cobro', hoy)
        .orderByRaw('rutas.orden asc nulls last, clientes.orden_visita asc nulls last')
        .select('prestamos.*')

      // ── 2. Seguimientos pendientes para HOY ───────────────────────────────
      const seguimientosHoy = await Seguimiento.query()
        .where('fecha_seguimiento', fechaHoy)
        .where('resuelta', false)
        .preload('prestamo', (q) =>
          q.preload('cliente', (cq) => cq.preload('ruta')).preload('pagos')
        )

      // IDs ya incluidos por ruta para no duplicar
      const idsEnRuta = new Set(prestamosPorRuta.map(p => p.id))

      // Préstamos extra por seguimiento que no estén ya en la lista
      const prestamosPorSeguimiento = seguimientosHoy
        .filter(s => !idsEnRuta.has(s.prestamoId) && s.prestamo.estado === 'activo')
        .map(s => s.prestamo)

      // ── 3. Combinar ───────────────────────────────────────────────────────
      const todosLosPrestamos = [...prestamosPorRuta, ...prestamosPorSeguimiento]

      // ── 4. Mapear cobros ──────────────────────────────────────────────────
      const cobros = todosLosPrestamos.map((prestamo) => {
        const montoTotal    = Number(prestamo.monto) * (1 + Number(prestamo.interes) / 100)
        const montoCuota    = Number((montoTotal / prestamo.cuotas).toFixed(2))
        const cuotasPagadas = prestamo.pagos.length
        const proximaCuota  = cuotasPagadas + 1

        // ── BUG FIX: fechaPago viene como DateTime de Luxon, no como Date de JS
        const yaPagoHoy = prestamo.pagos.some((p) => {
          try {
            if (p.fechaPago && typeof (p.fechaPago as any).toISODate === 'function') {
              return (p.fechaPago as DateTime).toISODate() === fechaHoy
            }
            return DateTime.fromJSDate(new Date(p.fechaPago as any))
              .setZone('America/Guatemala')
              .toISODate() === fechaHoy
          } catch {
            return false
          }
        })

        // Seguimiento pendiente de este préstamo para hoy
        const seguimientoPendiente = seguimientosHoy.find(
          s => s.prestamoId === prestamo.id && !s.resuelta
        )

        return {
          prestamoId:      prestamo.id,
          rutaNombre:      prestamo.cliente.ruta?.nombre || null,
          rutaOrden:       prestamo.cliente.ruta?.orden  || null,
          esSeguimiento:   !idsEnRuta.has(prestamo.id),
          seguimientoId:   seguimientoPendiente?.id   || null,
          seguimientoTipo: seguimientoPendiente?.tipo  || null,
          seguimientoNota: seguimientoPendiente?.nota  || null,
          cliente: {
            id:          prestamo.cliente.id,
            nombres:     prestamo.cliente.nombres,
            apellidos:   prestamo.cliente.apellidos,
            telefono:    prestamo.cliente.telefono,
            direccion:   prestamo.cliente.direccion,
            zona:        prestamo.cliente.zona,
            ordenVisita: prestamo.cliente.ordenVisita,
          },
          montoCuota,
          proximaCuota,
          cuotasPagadas,
          totalCuotas:     prestamo.cuotas,
          yaPagoHoy,
        }
      })

      const pendientes = cobros.filter(c => !c.yaPagoHoy)
      const cobrados   = cobros.filter(c => c.yaPagoHoy)

      return response.ok({
        dia:             hoy,
        fecha:           fechaHoy,
        totalPendientes: pendientes.length,
        totalCobrados:   cobrados.length,
        totalRecaudado:  cobrados.reduce((sum, c) => sum + c.montoCuota, 0),
        pendientes,
        cobrados,
      })
    } catch (error) {
      console.error(error)
      return response.internalServerError({ message: 'Error al obtener ruta del día' })
    }
  }
}