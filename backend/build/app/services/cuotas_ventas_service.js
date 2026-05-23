const EPSILON = 0.01;
export function calcularEnganchePagado(venta) {
    return Number((venta.pagos || [])
        .filter((pago) => pago.tipoPago === 'enganche')
        .reduce((sum, pago) => sum + Number(pago.montoPagado || 0), 0)
        .toFixed(2));
}
export function calcularMontoFinanciado(venta) {
    return Number(Math.max(Number(venta.monto || 0) - calcularEnganchePagado(venta), 0).toFixed(2));
}
export function calcularCuotaMonto(venta) {
    return Number((calcularMontoFinanciado(venta) / Number(venta.cuotas || 1)).toFixed(2));
}
function agruparPagosCuotas(pagos) {
    const resumen = new Map();
    for (const pago of pagos) {
        if (pago.numeroCuota <= 0 || (pago.tipoPago && pago.tipoPago !== 'cuota'))
            continue;
        const actual = resumen.get(pago.numeroCuota) || 0;
        resumen.set(pago.numeroCuota, Number((actual + Number(pago.montoPagado || 0)).toFixed(2)));
    }
    return resumen;
}
export function resumenCuotasVenta(venta) {
    const cuotaMonto = calcularCuotaMonto(venta);
    const pagos = (venta.pagos || []);
    const pagosPorCuota = agruparPagosCuotas(pagos);
    const totalPagado = Number(pagos.reduce((sum, pago) => sum + Number(pago.montoPagado || 0), 0).toFixed(2));
    const saldoPendiente = Number(Math.max(Number(venta.monto) - totalPagado, 0).toFixed(2));
    let cuotasPagadas = 0;
    let proximaCuota = null;
    let montoPendienteCuota = 0;
    for (let cuota = 1; cuota <= Number(venta.cuotas || 0); cuota++) {
        const pagado = pagosPorCuota.get(cuota) || 0;
        const pendiente = Number(Math.max(cuotaMonto - pagado, 0).toFixed(2));
        if (pendiente <= EPSILON) {
            cuotasPagadas++;
            continue;
        }
        if (!proximaCuota) {
            proximaCuota = cuota;
            montoPendienteCuota = Number(Math.min(pendiente, saldoPendiente).toFixed(2));
        }
    }
    if (saldoPendiente <= EPSILON) {
        proximaCuota = null;
        montoPendienteCuota = 0;
    }
    else if (!proximaCuota && Number(venta.cuotas || 0) > 0) {
        proximaCuota = Number(venta.cuotas);
        montoPendienteCuota = saldoPendiente;
    }
    return {
        cuotaMonto,
        cuotasPagadas,
        proximaCuota,
        montoPendienteCuota,
        saldoPendiente,
        totalPagado,
        pagosPorCuota,
        enganchePagado: calcularEnganchePagado(venta),
        montoFinanciado: calcularMontoFinanciado(venta),
    };
}
//# sourceMappingURL=cuotas_ventas_service.js.map