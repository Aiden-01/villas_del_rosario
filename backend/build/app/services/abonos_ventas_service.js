import { DateTime } from 'luxon';
import Pago from '#models/pago';
import Prestamo from '#models/prestamo';
import { resumenCuotasVenta } from '#services/cuotas_ventas_service';
const EPSILON = 0.01;
async function actualizarEstadoVenta(venta) {
    await venta.load('pagos');
    const resumen = resumenCuotasVenta(venta);
    if (resumen.saldoPendiente <= EPSILON) {
        venta.estado = 'pagado';
        await venta.save();
    }
    else if (venta.estado === 'pagado') {
        venta.estado = 'activo';
        await venta.save();
    }
    return resumen;
}
export async function aplicarAbonoAVenta(params) {
    const venta = await Prestamo.query()
        .where('id', params.ventaId)
        .preload('cliente')
        .preload('lote')
        .preload('pagos')
        .firstOrFail();
    const montoSolicitado = Number(params.monto);
    if (montoSolicitado <= 0) {
        throw new Error('El monto del abono debe ser mayor a 0');
    }
    const resumenInicial = resumenCuotasVenta(venta);
    if (resumenInicial.saldoPendiente <= EPSILON) {
        throw new Error('La venta ya no tiene saldo pendiente');
    }
    if (montoSolicitado - resumenInicial.saldoPendiente > EPSILON) {
        throw new Error(`El abono excede el saldo pendiente de Q${resumenInicial.saldoPendiente}`);
    }
    const monto = montoSolicitado > resumenInicial.saldoPendiente
        ? resumenInicial.saldoPendiente
        : montoSolicitado;
    const fechaPago = typeof params.fechaPago === 'string' ? DateTime.fromISO(params.fechaPago) : params.fechaPago;
    const tipoPago = params.tipoPago || 'abono';
    const pago = await Pago.create({
        prestamoId: venta.id,
        numeroCuota: 0,
        montoPagado: monto,
        fechaPago,
        usuarioId: params.usuarioId,
        tipoPago,
    });
    const resumenFinal = await actualizarEstadoVenta(venta);
    return {
        venta,
        pagos: [{ pago, numeroCuota: 0, monto }],
        totalAplicado: monto,
        saldoRestante: resumenFinal.saldoPendiente,
        ventaPagada: resumenFinal.saldoPendiente <= EPSILON,
    };
}
//# sourceMappingURL=abonos_ventas_service.js.map