import { DateTime } from 'luxon';
import db from '@adonisjs/lucid/services/db';
import Pago from '#models/pago';
import Prestamo from '#models/prestamo';
import PagoAplicacion from '#models/pago_aplicacion';
import { calcularPlanCuotas, resumenCuotasVentaDesdeAplicaciones, } from '#services/cuotas_ventas_service';
import { reconstruirAplicacionesVenta } from '#services/reconstruir_aplicaciones_service';
export async function aplicarPagoVenta(params) {
    return db.transaction(async (trx) => {
        const venta = await Prestamo.query({ client: trx })
            .where('id', params.ventaId)
            .forUpdate()
            .preload('cliente')
            .preload('lote')
            .preload('predios', (predios) => predios.preload('lote'))
            .preload('pagos')
            .firstOrFail();
        const pagosActivos = venta.pagos.filter((p) => !p.anulado);
        await reconstruirAplicacionesVenta(venta.id, trx);
        const aplicacionesExistentes = await PagoAplicacion.query({ client: trx }).where('venta_id', venta.id);
        const resumenActual = resumenCuotasVentaDesdeAplicaciones(venta, aplicacionesExistentes, pagosActivos);
        const monto = Number(Number(params.monto).toFixed(2));
        if (monto <= 0)
            throw new Error('El monto debe ser mayor a 0');
        if (venta.estado === 'cancelado')
            throw new Error('No se pueden registrar pagos en una venta cancelada');
        if (venta.estado === 'pagado' || resumenActual.saldoPendiente <= 0.005)
            throw new Error('La venta ya no tiene saldo pendiente');
        if (params.numeroCuotaReferencia !== undefined &&
            Number(params.numeroCuotaReferencia) !== resumenActual.proximaCuota) {
            throw new Error(`La cuota pendiente actual es la #${resumenActual.proximaCuota}`);
        }
        if (monto - resumenActual.saldoPendiente > 0.005)
            throw new Error(`El monto Q${monto} excede el saldo pendiente de Q${resumenActual.saldoPendiente.toFixed(2)}`);
        const pagosPorCuota = new Map();
        for (const aplicacion of aplicacionesExistentes) {
            const actual = pagosPorCuota.get(aplicacion.numeroCuota) || 0;
            pagosPorCuota.set(aplicacion.numeroCuota, Number((actual + Number(aplicacion.montoAplicado)).toFixed(2)));
        }
        const fechaPago = typeof params.fechaPago === 'string' ? DateTime.fromISO(params.fechaPago) : params.fechaPago;
        const pago = await Pago.create({
            prestamoId: params.ventaId,
            numeroCuota: params.numeroCuotaReferencia ?? 0,
            montoPagado: monto,
            fechaPago,
            usuarioId: params.usuarioId,
            tipoPago: params.tipoPago || 'cuota',
            anulado: false,
        }, { client: trx });
        const plan = calcularPlanCuotas(venta);
        let restante = monto;
        const aplicaciones = [];
        for (const cuota of plan) {
            if (restante <= 0.005)
                break;
            const pagado = pagosPorCuota.get(cuota.numero) || 0;
            const pendiente = Number(Math.max(cuota.monto - pagado, 0).toFixed(2));
            if (pendiente <= 0.005)
                continue;
            const aplicar = Number(Math.min(restante, pendiente).toFixed(2));
            aplicaciones.push({ numeroCuota: cuota.numero, montoAplicado: aplicar });
            pagosPorCuota.set(cuota.numero, Number((pagado + aplicar).toFixed(2)));
            restante = Number((restante - aplicar).toFixed(2));
        }
        if (restante > 0.005) {
            throw new Error(`No se pudo aplicar Q${restante.toFixed(2)} dentro del plan contractual`);
        }
        if (aplicaciones.length > 0) {
            await PagoAplicacion.createMany(aplicaciones.map((a) => ({
                pagoId: pago.id,
                ventaId: params.ventaId,
                numeroCuota: a.numeroCuota,
                montoAplicado: a.montoAplicado,
            })), { client: trx });
        }
        await venta.load('pagos', (q) => q.useTransaction(trx));
        const aplicacionesFinales = await PagoAplicacion.query({ client: trx }).where('venta_id', venta.id);
        const resumenFinal = resumenCuotasVentaDesdeAplicaciones(venta, aplicacionesFinales, venta.pagos.filter((p) => !p.anulado));
        let nuevoEstado = venta.estado;
        if (resumenFinal.saldoPendiente <= 0.005) {
            nuevoEstado = 'pagado';
        }
        else if (venta.estado === 'pagado') {
            nuevoEstado = 'activo';
        }
        if (nuevoEstado !== venta.estado) {
            venta.estado = nuevoEstado;
            await venta.useTransaction(trx).save();
        }
        return { pago, aplicaciones, resumenFinal };
    });
}
//# sourceMappingURL=aplicar_pago_service.js.map