import { DateTime } from 'luxon';
import { calcularPlanCuotas, resumenCuotasVenta, resumenCuotasVentaDesdeAplicaciones, } from '#services/cuotas_ventas_service';
const TZ = 'America/Guatemala';
export function fechaContractualCuota(venta, numeroCuota) {
    const base = venta.fechaCobro || venta.fechaInicio;
    if (!base)
        return null;
    const dt = typeof base.plus === 'function'
        ? DateTime.fromObject({
            year: base.year,
            month: base.month,
            day: base.day,
        }, { zone: TZ })
        : DateTime.fromISO(String(base), { zone: TZ });
    return dt.plus({ months: Math.max(numeroCuota - 1, 0) }).toISODate();
}
export function fechaEfectivaCuota(venta, numeroCuota, programaciones) {
    const abierta = programaciones
        .filter((p) => !p.resuelto && p.numeroCuota === numeroCuota)
        .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))[0];
    if (abierta) {
        const dt = typeof abierta.fechaProgramada.toISODate === 'function'
            ? abierta.fechaProgramada.toISODate()
            : String(abierta.fechaProgramada).split('T')[0];
        return dt;
    }
    return fechaContractualCuota(venta, numeroCuota);
}
export function calcularMora(venta, programaciones, resumenOverride) {
    const resumen = resumenOverride || resumenCuotasVenta(venta);
    if (!resumen.proximaCuota || resumen.saldoPendiente <= 0.005) {
        return { enMora: false, diasAtraso: 0, fechaContractual: null, fechaEfectiva: null };
    }
    const hoy = DateTime.now().setZone(TZ).startOf('day');
    const fechaContractual = fechaContractualCuota(venta, resumen.proximaCuota);
    const fechaEfectiva = fechaEfectivaCuota(venta, resumen.proximaCuota, programaciones);
    if (!fechaEfectiva) {
        return { enMora: false, diasAtraso: 0, fechaContractual, fechaEfectiva: fechaEfectiva };
    }
    const fechaDt = DateTime.fromISO(fechaEfectiva, { zone: TZ }).startOf('day');
    const diasAtraso = Math.max(Math.floor(hoy.diff(fechaDt, 'days').days), 0);
    const enMora = fechaDt < hoy;
    return { enMora, diasAtraso, fechaContractual, fechaEfectiva };
}
export function resumenFinancieroVenta(venta, programaciones) {
    const resumen = resumenCuotasVentaDesdeAplicaciones(venta, venta.pagoAplicaciones || [], venta.pagos || []);
    const mora = calcularMora(venta, programaciones, resumen);
    const plan = calcularPlanCuotas(venta);
    const cuotaActualPlan = plan.find((c) => c.numero === resumen.proximaCuota);
    const cuotasContractuales = Number(venta.cuotas || 0);
    return {
        cuotasContractuales,
        montoTotal: Number(venta.monto),
        enganche: resumen.enganchePagado,
        montoFinanciado: resumen.montoFinanciado,
        totalPagado: resumen.totalPagado,
        saldoPendiente: resumen.saldoPendiente,
        cuotasPagadas: resumen.cuotasPagadas,
        fraccion: `${resumen.cuotasPagadas}/${cuotasContractuales}`,
        porcentaje: cuotasContractuales > 0 ? Math.round((resumen.cuotasPagadas / cuotasContractuales) * 100) : 0,
        cuotaActual: resumen.proximaCuota,
        valorCuotaActual: cuotaActualPlan?.monto ?? resumen.cuotaMonto,
        pagadoCuotaActual: Number((cuotaActualPlan
            ? Math.max(cuotaActualPlan.monto - resumen.montoPendienteCuota, 0)
            : 0).toFixed(2)),
        pendienteCuotaActual: resumen.montoPendienteCuota,
        enMora: mora.enMora,
        diasAtraso: mora.diasAtraso,
        fechaContractualCuotaActual: mora.fechaContractual,
        fechaEfectivaCuotaActual: mora.fechaEfectiva,
        estado: venta.estado,
    };
}
//# sourceMappingURL=mora_service.js.map