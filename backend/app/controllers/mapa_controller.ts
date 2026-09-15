import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import Prestamo from '#models/prestamo'
import { resumenFinancieroVenta } from '#services/mora_service'
import { loteIdsAsociadosVenta } from '#services/lotes_disponibilidad_service'

type GeoJsonPolygon = {
  type: 'Polygon'
  coordinates: number[][][]
}

type FilaGeometria = {
  loteId: number | string
  codigo: string
  numero: string
  medida: string | null
  area: number | string | null
  geometry: GeoJsonPolygon
}

type EstadoMapa = 'disponible' | 'vendido' | 'pagado' | 'mora' | 'conflicto'

type VentaConResumen = {
  venta: Prestamo
  resumenFinanciero: ReturnType<typeof resumenFinancieroVenta>
}

function estadoMapaVenta(resumen: ReturnType<typeof resumenFinancieroVenta>): EstadoMapa {
  if (resumen.enMora) return 'mora'
  if (resumen.estado === 'pagado') return 'pagado'
  return 'vendido'
}

export default class MapaController {
  async lotes({ response }: HttpContext) {
    try {
      const resultado = await db.rawQuery(`
        SELECT
          lg.lote_id AS "loteId",
          lg.codigo,
          l.numero,
          l.medida,
          lg.area_fuente AS area,
          ST_AsGeoJSON(lg.geom)::json AS geometry
        FROM lote_geometrias lg
        INNER JOIN lotes l ON l.id = lg.lote_id
        ORDER BY lg.codigo ASC
      `)
      const geometrias = resultado.rows as FilaGeometria[]

      if (geometrias.length === 0) {
        return response.ok({ type: 'FeatureCollection', features: [] })
      }

      const loteIds = geometrias.map((geometria) => Number(geometria.loteId))
      const ventas = await Prestamo.query()
        .where('estado', '!=', 'cancelado')
        .where((query) => {
          query
            .whereIn('lote_id', loteIds)
            .orWhereHas('predios', (predios) => predios.whereIn('lote_id', loteIds))
        })
        .preload('cliente')
        .preload('pagos', (pagos) => pagos.where('anulado', false))
        .preload('pagoAplicaciones', (aplicaciones) => aplicaciones.orderBy('numero_cuota', 'asc'))
        .preload('programaciones')
        .preload('predios')
        .orderBy('id', 'desc')

      const ventasPorLote = new Map<number, VentaConResumen[]>()

      for (const venta of ventas) {
        const resumenFinanciero = resumenFinancieroVenta(venta, venta.programaciones || [])
        const asociacion = { venta, resumenFinanciero }

        for (const loteId of loteIdsAsociadosVenta(venta)) {
          const asociaciones = ventasPorLote.get(loteId) || []
          asociaciones.push(asociacion)
          ventasPorLote.set(loteId, asociaciones)
        }
      }

      const features = geometrias.map((geometria) => {
        const loteId = Number(geometria.loteId)
        const asociaciones = ventasPorLote.get(loteId) || []
        const conflictoIntegridad = asociaciones.length > 1
        const asociacion = asociaciones.length === 1 ? asociaciones[0] : null

        return {
          type: 'Feature' as const,
          geometry: geometria.geometry,
          properties: {
            loteId,
            codigo: geometria.codigo,
            numero: geometria.numero,
            medida: geometria.medida,
            area: geometria.area === null ? null : Number(geometria.area),
            estadoMapa: conflictoIntegridad
              ? ('conflicto' as const)
              : asociacion
                ? estadoMapaVenta(asociacion.resumenFinanciero)
                : ('disponible' as const),
            ventaId: asociacion?.venta.id ?? null,
            cliente: asociacion
              ? {
                  id: asociacion.venta.cliente.id,
                  nombres: asociacion.venta.cliente.nombres,
                  apellidos: asociacion.venta.cliente.apellidos,
                }
              : null,
            resumenFinanciero: asociacion?.resumenFinanciero ?? null,
            ...(conflictoIntegridad
              ? {
                  conflictoIntegridad: true,
                  cantidadVentasActivas: asociaciones.length,
                }
              : {}),
          },
        }
      })

      return response.ok({ type: 'FeatureCollection', features })
    } catch (error) {
      console.error(error)
      return response.internalServerError({ message: 'Error al obtener lotes del mapa' })
    }
  }
}
