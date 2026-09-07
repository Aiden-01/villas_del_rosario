import { DateTime } from 'luxon'
import Prestamo from '#models/prestamo'
import ProgramacionPago from '#models/programacion_pago'
import {
  calcularPlanCuotas,
  resumenCuotasVenta,
  resumenCuotasVentaDesdeAplicaciones,
} from '#services/cuotas_ventas_service'

const TZ = 'America/Guatemala'

export type EstadoMora = {
  enMora: boolean
  diasAtraso: number
  fechaContractual: string | null
  fechaEfectiva: string | null
}

/**
 * Determina la fecha contractual de una cuota dada.
 * La fecha base es fechaCobro (si existe) o fechaInicio de la venta.
 * Cada cuota suma (numeroCuota - 1) meses a esa fecha base.
 */
export function fechaContractualCuota(venta: Prestamo, numeroCuota: number): string | null {
  const base = venta.fechaCobro || venta.fechaInicio
  if (!base) return null

  // Normalizar a DateTime de Luxon en la zona horaria correcta
  const dt =
    typeof (base as any).plus === 'function'
      ? DateTime.fromObject(
          {
            year: (base as DateTime).year,
            month: (base as DateTime).month,
            day: (base as DateTime).day,
          },
          { zone: TZ }
        )
      : DateTime.fromISO(String(base), { zone: TZ })

  return dt.plus({ months: Math.max(numeroCuota - 1, 0) }).toISODate()
}

/**
 * Determina la fecha efectiva de una cuota.
 * Si hay una programación de pago abierta (no resuelta) para esa cuota,
 * usa su fecha; de lo contrario, usa la fecha contractual.
 */
export function fechaEfectivaCuota(
  venta: Prestamo,
  numeroCuota: number,
  programaciones: ProgramacionPago[]
): string | null {
  // Buscar la programación abierta más reciente para esta cuota
  const abierta = programaciones
    .filter((p) => !p.resuelto && p.numeroCuota === numeroCuota)
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))[0]

  if (abierta) {
    const dt =
      typeof (abierta.fechaProgramada as any).toISODate === 'function'
        ? (abierta.fechaProgramada as DateTime).toISODate()
        : String(abierta.fechaProgramada).split('T')[0]
    return dt
  }

  return fechaContractualCuota(venta, numeroCuota)
}

/**
 * Calcula el estado de mora de la cuota actual de una venta.
 * La mora se determina comparando la fecha efectiva con el día de hoy.
 */
export function calcularMora(
  venta: Prestamo,
  programaciones: ProgramacionPago[],
  resumenOverride?: ReturnType<typeof resumenCuotasVenta>
): EstadoMora {
  const resumen = resumenOverride || resumenCuotasVenta(venta)

  if (!resumen.proximaCuota || resumen.saldoPendiente <= 0.005) {
    return { enMora: false, diasAtraso: 0, fechaContractual: null, fechaEfectiva: null }
  }

  const hoy = DateTime.now().setZone(TZ).startOf('day')
  const fechaContractual = fechaContractualCuota(venta, resumen.proximaCuota)
  const fechaEfectiva = fechaEfectivaCuota(venta, resumen.proximaCuota, programaciones)

  if (!fechaEfectiva) {
    return { enMora: false, diasAtraso: 0, fechaContractual, fechaEfectiva: fechaEfectiva }
  }

  const fechaDt = DateTime.fromISO(fechaEfectiva, { zone: TZ }).startOf('day')
  const diasAtraso = Math.max(Math.floor(hoy.diff(fechaDt, 'days').days), 0)
  const enMora = fechaDt < hoy

  return { enMora, diasAtraso, fechaContractual, fechaEfectiva }
}

/**
 * Genera el resumen financiero completo y autoritativo de una venta.
 * Este es el único resumen que el backend debe devolver al frontend.
 * Combina datos contractuales, estado financiero actual y mora.
 */
export function resumenFinancieroVenta(venta: Prestamo, programaciones: ProgramacionPago[]) {
  const resumen = resumenCuotasVentaDesdeAplicaciones(
    venta,
    venta.pagoAplicaciones || [],
    venta.pagos || []
  )
  const mora = calcularMora(venta, programaciones, resumen)
  const plan = calcularPlanCuotas(venta)
  const cuotaActualPlan = plan.find((c) => c.numero === resumen.proximaCuota)
  const cuotasContractuales = Number(venta.cuotas || 0)

  return {
    // Datos contractuales
    cuotasContractuales,
    montoTotal: Number(venta.monto),
    enganche: resumen.enganchePagado,
    montoFinanciado: resumen.montoFinanciado,

    // Estado financiero actual
    totalPagado: resumen.totalPagado,
    saldoPendiente: resumen.saldoPendiente,
    cuotasPagadas: resumen.cuotasPagadas,
    fraccion: `${resumen.cuotasPagadas}/${cuotasContractuales}`,
    porcentaje:
      cuotasContractuales > 0 ? Math.round((resumen.cuotasPagadas / cuotasContractuales) * 100) : 0,

    // Cuota actual
    cuotaActual: resumen.proximaCuota,
    valorCuotaActual: cuotaActualPlan?.monto ?? resumen.cuotaMonto,
    pagadoCuotaActual: Number(
      (cuotaActualPlan
        ? Math.max(cuotaActualPlan.monto - resumen.montoPendienteCuota, 0)
        : 0
      ).toFixed(2)
    ),
    pendienteCuotaActual: resumen.montoPendienteCuota,

    // Mora
    enMora: mora.enMora,
    diasAtraso: mora.diasAtraso,
    fechaContractualCuotaActual: mora.fechaContractual,
    fechaEfectivaCuotaActual: mora.fechaEfectiva,

    // Estado general
    estado: venta.estado,
  }
}
