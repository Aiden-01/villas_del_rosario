import { DateTime } from 'luxon';
import db from '@adonisjs/lucid/services/db';
import Pago from '#models/pago';
import Prestamo from '#models/prestamo';
import { aplicarPagoVenta } from '#services/aplicar_pago_service';
import { resumenCuotasVenta } from '#services/cuotas_ventas_service';
export async function aplicarAbonoAVenta(params) {
    if (params.tipoPago === 'enganche') {
        const run = async (trx) => {
            const venta = await Prestamo.query({ client: trx })
                .where('id', params.ventaId)
                .forUpdate()
                .preload('pagos')
                .firstOrFail();
            if (venta.estado === 'cancelado' || venta.pagos.length > 0)
                throw new Error('El enganche solo se registra al crear una venta sin movimientos');
            const fechaPago = typeof params.fechaPago === 'string' ? DateTime.fromISO(params.fechaPago) : params.fechaPago;
            const monto = Number(Number(params.monto).toFixed(2));
            if (!fechaPago.isValid ||
                !Number.isFinite(monto) ||
                monto <= 0 ||
                monto > Number(venta.monto))
                throw new Error('Enganche invalido');
            const pago = await Pago.create({
                prestamoId: params.ventaId,
                numeroCuota: 0,
                montoPagado: monto,
                fechaPago,
                usuarioId: params.usuarioId,
                tipoPago: 'enganche',
                anulado: false,
            }, { client: trx });
            await venta.load('pagos', (q) => q.useTransaction(trx));
            const pagosActivos = venta.pagos.filter((p) => !p.anulado);
            const resumen = resumenCuotasVenta(venta, pagosActivos);
            if (resumen.saldoPendiente <= 0.005) {
                venta.estado = 'pagado';
                await venta.useTransaction(trx).save();
            }
            return {
                venta,
                pagos: [{ pago, numeroCuota: 0, monto }],
                aplicaciones: [],
                totalAplicado: monto,
                saldoRestante: resumen.saldoPendiente,
                ventaPagada: resumen.saldoPendiente <= 0.005,
            };
        };
        return params.trx ? run(params.trx) : db.transaction(run);
    }
    const resultado = await aplicarPagoVenta({
        ventaId: params.ventaId,
        monto: params.monto,
        fechaPago: params.fechaPago,
        usuarioId: params.usuarioId,
        tipoPago: 'abono',
    });
    const venta = await Prestamo.query().where('id', params.ventaId).preload('pagos').firstOrFail();
    return {
        venta,
        pagos: [
            {
                pago: resultado.pago,
                numeroCuota: resultado.aplicaciones[0]?.numeroCuota ?? 0,
                monto: Number(resultado.pago.montoPagado),
            },
        ],
        aplicaciones: resultado.aplicaciones,
        totalAplicado: Number(resultado.pago.montoPagado),
        saldoRestante: resultado.resumenFinal.saldoPendiente,
        ventaPagada: resultado.resumenFinal.saldoPendiente <= 0.005,
    };
}
//# sourceMappingURL=abonos_ventas_service.js.map