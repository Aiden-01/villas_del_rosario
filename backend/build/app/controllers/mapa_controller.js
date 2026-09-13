import db from '@adonisjs/lucid/services/db';
import Prestamo from '#models/prestamo';
import { resumenFinancieroVenta } from '#services/mora_service';
function estadoMapaVenta(resumen) {
    if (resumen.enMora)
        return 'mora';
    if (resumen.estado === 'pagado')
        return 'pagado';
    return 'vendido';
}
export default class MapaController {
    async lotes({ response }) {
        try {
            const resultado = await db.rawQuery(`
        SELECT
          lg.lote_id AS "loteId",
          lg.codigo,
          l.numero,
          lg.area_fuente AS area,
          ST_AsGeoJSON(lg.geom)::json AS geometry
        FROM lote_geometrias lg
        INNER JOIN lotes l ON l.id = lg.lote_id
        ORDER BY lg.codigo ASC
      `);
            const geometrias = resultado.rows;
            if (geometrias.length === 0) {
                return response.ok({ type: 'FeatureCollection', features: [] });
            }
            const loteIds = geometrias.map((geometria) => Number(geometria.loteId));
            const ventas = await Prestamo.query()
                .where('estado', '!=', 'cancelado')
                .where((query) => {
                query
                    .whereIn('lote_id', loteIds)
                    .orWhereHas('predios', (predios) => predios.whereIn('lote_id', loteIds));
            })
                .preload('cliente')
                .preload('pagos', (pagos) => pagos.where('anulado', false))
                .preload('pagoAplicaciones', (aplicaciones) => aplicaciones.orderBy('numero_cuota', 'asc'))
                .preload('programaciones')
                .preload('predios')
                .orderBy('id', 'desc');
            const ventasPorLote = new Map();
            for (const venta of ventas) {
                const resumenFinanciero = resumenFinancieroVenta(venta, venta.programaciones || []);
                const asociacion = { venta, resumenFinanciero };
                const loteIdsVenta = venta.predios.length > 0
                    ? venta.predios.flatMap((predio) => (predio.loteId ? [predio.loteId] : []))
                    : venta.loteId
                        ? [venta.loteId]
                        : [];
                for (const loteId of new Set(loteIdsVenta)) {
                    const asociaciones = ventasPorLote.get(loteId) || [];
                    asociaciones.push(asociacion);
                    ventasPorLote.set(loteId, asociaciones);
                }
            }
            const features = geometrias.map((geometria) => {
                const loteId = Number(geometria.loteId);
                const asociaciones = ventasPorLote.get(loteId) || [];
                const conflictoIntegridad = asociaciones.length > 1;
                const asociacion = asociaciones.length === 1 ? asociaciones[0] : null;
                return {
                    type: 'Feature',
                    geometry: geometria.geometry,
                    properties: {
                        loteId,
                        codigo: geometria.codigo,
                        numero: geometria.numero,
                        area: geometria.area === null ? null : Number(geometria.area),
                        estadoMapa: conflictoIntegridad
                            ? 'conflicto'
                            : asociacion
                                ? estadoMapaVenta(asociacion.resumenFinanciero)
                                : 'disponible',
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
                };
            });
            return response.ok({ type: 'FeatureCollection', features });
        }
        catch (error) {
            console.error(error);
            return response.internalServerError({ message: 'Error al obtener lotes del mapa' });
        }
    }
}
//# sourceMappingURL=mapa_controller.js.map