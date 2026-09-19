import Lote from '#models/lote';
import Prestamo from '#models/prestamo';
import { agruparVentasActivasPorLote, estadoDisponibilidadLote, } from '#services/lotes_disponibilidad_service';
export default class LotesController {
    async index({ response }) {
        try {
            const lotes = await Lote.query().orderBy('numero', 'asc');
            const loteIds = lotes.map((lote) => lote.id);
            const ventas = loteIds.length
                ? await Prestamo.query()
                    .where('estado', '!=', 'cancelado')
                    .where((query) => {
                    query
                        .whereIn('lote_id', loteIds)
                        .orWhereHas('predios', (predios) => predios.whereIn('lote_id', loteIds));
                })
                    .preload('predios')
                : [];
            const ventasPorLote = agruparVentasActivasPorLote(ventas);
            return response.ok({
                lotes: lotes.map((lote) => {
                    const cantidadVentasActivas = ventasPorLote.get(lote.id)?.length || 0;
                    const estadoDisponibilidad = estadoDisponibilidadLote(cantidadVentasActivas, lote.habilitadoVenta);
                    return {
                        loteId: lote.id,
                        numero: lote.numero,
                        area: lote.area,
                        medida: lote.medida,
                        habilitadoVenta: lote.habilitadoVenta,
                        estadoDisponibilidad,
                        disponible: estadoDisponibilidad === 'disponible',
                        cantidadVentasActivas,
                    };
                }),
            });
        }
        catch (error) {
            console.error(error);
            return response.internalServerError({ message: 'Error al obtener lotes' });
        }
    }
}
//# sourceMappingURL=lotes_controller.js.map