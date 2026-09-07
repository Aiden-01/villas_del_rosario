const EPSILON = 0.005;
export function calcularEnganchePagado(venta, pagosOverride) {
    const listaPagos = pagosOverride || venta.pagos || [];
    return Number(listaPagos
        .filter((pago) => pago.tipoPago === 'enganche' && !pago.anulado)
        .reduce((sum, pago) => sum + Number(pago.montoPagado || 0), 0)
        .toFixed(2));
}
export function calcularMontoFinanciado(venta, pagosOverride) {
    return Number(Math.max(Number(venta.monto || 0) - calcularEnganchePagado(venta, pagosOverride), 0).toFixed(2));
}
export function calcularCuotaMonto(venta, pagosOverride) {
    return calcularPlanCuotas(venta, pagosOverride)[0]?.monto ?? 0;
}
export function calcularPlanCuotas(venta, pagosOverride) {
    const montoFinanciado = calcularMontoFinanciado(venta, pagosOverride);
    const numCuotas = Number(venta.cuotas || 0);
    if (numCuotas <= 0 || montoFinanciado <= 0)
        return [];
    const cuotaBase = Math.floor(Math.round(montoFinanciado * 100) / numCuotas) / 100;
    const plan = [];
    let sumadas = 0;
    for (let i = 1; i <= numCuotas; i++) {
        if (i === numCuotas) {
            const ultima = Number((montoFinanciado - sumadas).toFixed(2));
            plan.push({ numero: i, monto: ultima });
        }
        else {
            plan.push({ numero: i, monto: cuotaBase });
            sumadas = Number((sumadas + cuotaBase).toFixed(2));
        }
    }
    return plan;
}
export function distribuirPagosFIFO(venta, pagosOverride) {
    const pagos = [...(pagosOverride ?? venta.pagos ?? [])]
        .filter((p) => !p.anulado && p.tipoPago !== 'enganche')
        .sort((a, b) => String(a.fechaPago ?? '').localeCompare(String(b.fechaPago ?? '')) ||
        String(a.createdAt ?? '').localeCompare(String(b.createdAt ?? '')) ||
        (a.id ?? 0) - (b.id ?? 0));
    const plan = calcularPlanCuotas(venta, pagosOverride);
    const pendientes = plan.map((c) => Math.round(c.monto * 100));
    const aplicaciones = [];
    const pagosPorCuota = new Map();
    const anomalias = [];
    for (const pago of pagos) {
        let restante = Math.round(Number(pago.montoPagado) * 100);
        if (!Number.isSafeInteger(restante) || restante <= 0) {
            anomalias.push(`Pago #${pago.id}: monto invalido`);
            continue;
        }
        for (let i = 0; i < plan.length && restante > 0; i++) {
            const aplicado = Math.min(restante, pendientes[i]);
            if (aplicado <= 0)
                continue;
            aplicaciones.push({
                pagoId: pago.id,
                numeroCuota: plan[i].numero,
                montoAplicado: aplicado / 100,
            });
            pagosPorCuota.set(plan[i].numero, Number(((pagosPorCuota.get(plan[i].numero) ?? 0) + aplicado / 100).toFixed(2)));
            pendientes[i] -= aplicado;
            restante -= aplicado;
        }
        if (restante > 0)
            anomalias.push(`Pago #${pago.id}: Q${(restante / 100).toFixed(2)} sin cuota asignable`);
        const primera = aplicaciones.find((a) => a.pagoId === pago.id)?.numeroCuota;
        if (pago.numeroCuota > 0 && primera && pago.numeroCuota !== primera) {
            anomalias.push(`Pago #${pago.id}: cuota legacy ${pago.numeroCuota}, FIFO ${primera}; original conservado`);
        }
    }
    return { aplicaciones, pagosPorCuota, anomalias };
}
export function resumenCuotasVenta(venta, pagosOverride) {
    const plan = calcularPlanCuotas(venta, pagosOverride);
    const cuotaMonto = calcularCuotaMonto(venta, pagosOverride);
    const listaPagos = pagosOverride || venta.pagos || [];
    const pagos = listaPagos.filter((p) => !p.anulado);
    const { pagosPorCuota } = distribuirPagosFIFO(venta, pagos);
    const pagosSinEnganche = pagos.filter((p) => p.tipoPago !== 'enganche');
    const totalPagado = Number(pagosSinEnganche.reduce((sum, pago) => sum + Number(pago.montoPagado || 0), 0).toFixed(2));
    const montoFinanciado = calcularMontoFinanciado(venta, pagosOverride);
    const saldoPendiente = Number(Math.max(montoFinanciado - totalPagado, 0).toFixed(2));
    let cuotasPagadas = 0;
    let proximaCuota = null;
    let montoPendienteCuota = 0;
    for (const cuota of plan) {
        const pagado = pagosPorCuota.get(cuota.numero) || 0;
        const pendiente = Number(Math.max(cuota.monto - pagado, 0).toFixed(2));
        if (pendiente <= EPSILON) {
            cuotasPagadas++;
            continue;
        }
        if (!proximaCuota) {
            proximaCuota = cuota.numero;
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
        enganchePagado: calcularEnganchePagado(venta, pagosOverride),
        montoFinanciado,
    };
}
export function resumenCuotasVentaDesdeAplicaciones(venta, aplicaciones, pagosOverride) {
    const plan = calcularPlanCuotas(venta, pagosOverride);
    const cuotaMonto = plan[0]?.monto ?? 0;
    const pagosPorCuota = new Map();
    for (const aplicacion of aplicaciones) {
        const numeroCuota = Number(aplicacion.numeroCuota);
        const montoAplicado = Number(aplicacion.montoAplicado);
        if (!Number.isInteger(numeroCuota) || numeroCuota <= 0 || montoAplicado <= 0)
            continue;
        pagosPorCuota.set(numeroCuota, Number(((pagosPorCuota.get(numeroCuota) || 0) + montoAplicado).toFixed(2)));
    }
    const montoFinanciado = calcularMontoFinanciado(venta, pagosOverride);
    const totalPagado = Number(plan
        .reduce((total, cuota) => total + Math.min(pagosPorCuota.get(cuota.numero) || 0, cuota.monto), 0)
        .toFixed(2));
    const saldoPendiente = Number(Math.max(montoFinanciado - totalPagado, 0).toFixed(2));
    let cuotasPagadas = 0;
    let proximaCuota = null;
    let montoPendienteCuota = 0;
    for (const cuota of plan) {
        const pagado = pagosPorCuota.get(cuota.numero) || 0;
        const pendiente = Number(Math.max(cuota.monto - pagado, 0).toFixed(2));
        if (pendiente <= EPSILON) {
            cuotasPagadas++;
            continue;
        }
        if (!proximaCuota) {
            proximaCuota = cuota.numero;
            montoPendienteCuota = Number(Math.min(pendiente, saldoPendiente).toFixed(2));
        }
    }
    if (saldoPendiente <= EPSILON) {
        proximaCuota = null;
        montoPendienteCuota = 0;
    }
    return {
        cuotaMonto,
        cuotasPagadas,
        proximaCuota,
        montoPendienteCuota,
        saldoPendiente,
        totalPagado,
        pagosPorCuota,
        enganchePagado: calcularEnganchePagado(venta, pagosOverride),
        montoFinanciado,
    };
}
//# sourceMappingURL=cuotas_ventas_service.js.map