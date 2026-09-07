import db from '@adonisjs/lucid/services/db';
import Prestamo from '#models/prestamo';
import PagoAplicacion from '#models/pago_aplicacion';
import { distribuirPagosFIFO } from '#services/cuotas_ventas_service';
export async function reconstruirAplicacionesVenta(ventaId, trx) {
    const run = async (client) => {
        const anomalias = [];
        const venta = await Prestamo.query({ client })
            .where('id', ventaId)
            .forUpdate()
            .preload('pagos', (q) => q
            .where('anulado', false)
            .orderBy('fecha_pago', 'asc')
            .orderBy('created_at', 'asc')
            .orderBy('id', 'asc'))
            .firstOrFail();
        const distribucion = distribuirPagosFIFO(venta);
        anomalias.push(...distribucion.anomalias);
        const eliminadasResult = await PagoAplicacion.query({ client })
            .where('venta_id', ventaId)
            .delete();
        const aplicaciones = distribucion.aplicaciones.map((a) => ({ ...a, ventaId }));
        if (aplicaciones.length)
            await PagoAplicacion.createMany(aplicaciones, { client });
        const creadas = aplicaciones.length;
        return {
            ventaId,
            aplicacionesEliminadas: Number(eliminadasResult) || 0,
            aplicacionesCreadas: creadas,
            anomalias,
        };
    };
    if (trx) {
        return run(trx);
    }
    else {
        return db.transaction(run);
    }
}
export async function reconstruirAplicacionesTodasLasVentas() {
    const ventas = await Prestamo.query().select('id').orderBy('id', 'asc');
    let exitosas = 0;
    let fallidas = 0;
    const anomaliasGlobal = [];
    for (const venta of ventas) {
        try {
            const resultado = await reconstruirAplicacionesVenta(venta.id);
            exitosas++;
            anomaliasGlobal.push(...resultado.anomalias);
        }
        catch (error) {
            fallidas++;
            anomaliasGlobal.push(`Venta ${venta.id} FALLÓ: ${error.message}`);
        }
    }
    return { total: ventas.length, exitosas, fallidas, anomalias: anomaliasGlobal };
}
//# sourceMappingURL=reconstruir_aplicaciones_service.js.map