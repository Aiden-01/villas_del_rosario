const EPSILON = 0.005

export type PagoLike = {
  id?: number
  numeroCuota: number
  montoPagado: number
  tipoPago?: string | null
  anulado?: boolean
  fechaPago?: unknown
  createdAt?: unknown
}

export type VentaLike = {
  id?: number
  monto: number
  cuotas: number
  pagos?: PagoLike[]
  [key: string]: any
}

export type PagoAplicacionLike = {
  numeroCuota: number
  montoAplicado: number
}

export function calcularEnganchePagado(venta: VentaLike, pagosOverride?: PagoLike[]) {
  const listaPagos = pagosOverride || (venta.pagos as PagoLike[]) || []
  return Number(
    listaPagos
      .filter((pago) => pago.tipoPago === 'enganche' && !pago.anulado)
      .reduce((sum, pago) => sum + Number(pago.montoPagado || 0), 0)
      .toFixed(2)
  )
}

export function calcularMontoFinanciado(venta: VentaLike, pagosOverride?: PagoLike[]) {
  return Number(
    Math.max(Number(venta.monto || 0) - calcularEnganchePagado(venta, pagosOverride), 0).toFixed(2)
  )
}

export function calcularCuotaMonto(venta: VentaLike, pagosOverride?: PagoLike[]) {
  return calcularPlanCuotas(venta, pagosOverride)[0]?.monto ?? 0
}

/**
 * Calcula el plan contractual de cuotas con redondeo correcto.
 * La última cuota absorbe los centavos restantes para que sum === montoFinanciado exactamente.
 *
 * Ejemplo: montoFinanciado=100000, cuotas=3
 *   → [{1, 33333.33}, {2, 33333.33}, {3, 33333.34}]
 *   → sum = 100000.00
 */
export function calcularPlanCuotas(
  venta: VentaLike,
  pagosOverride?: PagoLike[]
): Array<{ numero: number; monto: number }> {
  const montoFinanciado = calcularMontoFinanciado(venta, pagosOverride)
  const numCuotas = Number(venta.cuotas || 0)
  if (numCuotas <= 0 || montoFinanciado <= 0) return []

  // Floor a 2 decimales para que las cuotas base no excedan el total
  const cuotaBase = Math.floor(Math.round(montoFinanciado * 100) / numCuotas) / 100
  const plan: Array<{ numero: number; monto: number }> = []
  let sumadas = 0

  for (let i = 1; i <= numCuotas; i++) {
    if (i === numCuotas) {
      // Última cuota: absorbe exactamente el remanente
      const ultima = Number((montoFinanciado - sumadas).toFixed(2))
      plan.push({ numero: i, monto: ultima })
    } else {
      plan.push({ numero: i, monto: cuotaBase })
      sumadas = Number((sumadas + cuotaBase).toFixed(2))
    }
  }

  return plan
}

/**
 * Agrupa los pagos de cuotas por número de cuota.
 */
export function distribuirPagosFIFO(venta: VentaLike, pagosOverride?: PagoLike[]) {
  const pagos = [...(pagosOverride ?? venta.pagos ?? [])]
    .filter((p) => !p.anulado && p.tipoPago !== 'enganche')
    .sort(
      (a, b) =>
        String(a.fechaPago ?? '').localeCompare(String(b.fechaPago ?? '')) ||
        String(a.createdAt ?? '').localeCompare(String(b.createdAt ?? '')) ||
        (a.id ?? 0) - (b.id ?? 0)
    )
  const plan = calcularPlanCuotas(venta, pagosOverride)
  const pendientes = plan.map((c) => Math.round(c.monto * 100))
  const aplicaciones: Array<{
    pagoId: number | undefined
    numeroCuota: number
    montoAplicado: number
  }> = []
  const pagosPorCuota = new Map<number, number>()
  const anomalias: string[] = []
  for (const pago of pagos) {
    let restante = Math.round(Number(pago.montoPagado) * 100)
    if (!Number.isSafeInteger(restante) || restante <= 0) {
      anomalias.push(`Pago #${pago.id}: monto invalido`)
      continue
    }
    for (let i = 0; i < plan.length && restante > 0; i++) {
      const aplicado = Math.min(restante, pendientes[i])
      if (aplicado <= 0) continue
      aplicaciones.push({
        pagoId: pago.id,
        numeroCuota: plan[i].numero,
        montoAplicado: aplicado / 100,
      })
      pagosPorCuota.set(
        plan[i].numero,
        Number(((pagosPorCuota.get(plan[i].numero) ?? 0) + aplicado / 100).toFixed(2))
      )
      pendientes[i] -= aplicado
      restante -= aplicado
    }
    if (restante > 0)
      anomalias.push(`Pago #${pago.id}: Q${(restante / 100).toFixed(2)} sin cuota asignable`)
    const primera = aplicaciones.find((a) => a.pagoId === pago.id)?.numeroCuota
    if (pago.numeroCuota > 0 && primera && pago.numeroCuota !== primera) {
      anomalias.push(
        `Pago #${pago.id}: cuota legacy ${pago.numeroCuota}, FIFO ${primera}; original conservado`
      )
    }
  }
  return { aplicaciones, pagosPorCuota, anomalias }
}

export function resumenCuotasVenta(venta: VentaLike, pagosOverride?: PagoLike[]) {
  const plan = calcularPlanCuotas(venta, pagosOverride)
  const cuotaMonto = calcularCuotaMonto(venta, pagosOverride)

  // Filtrar pagos anulados antes de procesar
  const listaPagos = pagosOverride || (venta.pagos as PagoLike[]) || []
  const pagos = listaPagos.filter((p) => !p.anulado)

  const { pagosPorCuota } = distribuirPagosFIFO(venta, pagos)

  // totalPagado excluye enganches: ya fueron descontados en montoFinanciado
  const pagosSinEnganche = pagos.filter((p) => p.tipoPago !== 'enganche')
  const totalPagado = Number(
    pagosSinEnganche.reduce((sum, pago) => sum + Number(pago.montoPagado || 0), 0).toFixed(2)
  )

  const montoFinanciado = calcularMontoFinanciado(venta, pagosOverride)
  const saldoPendiente = Number(Math.max(montoFinanciado - totalPagado, 0).toFixed(2))

  let cuotasPagadas = 0
  let proximaCuota: number | null = null
  let montoPendienteCuota = 0

  for (const cuota of plan) {
    const pagado = pagosPorCuota.get(cuota.numero) || 0
    const pendiente = Number(Math.max(cuota.monto - pagado, 0).toFixed(2))
    if (pendiente <= EPSILON) {
      cuotasPagadas++
      continue
    }

    if (!proximaCuota) {
      proximaCuota = cuota.numero
      montoPendienteCuota = Number(Math.min(pendiente, saldoPendiente).toFixed(2))
    }
  }

  if (saldoPendiente <= EPSILON) {
    proximaCuota = null
    montoPendienteCuota = 0
  } else if (!proximaCuota && Number(venta.cuotas || 0) > 0) {
    proximaCuota = Number(venta.cuotas)
    montoPendienteCuota = saldoPendiente
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
  }
}

/**
 * Construye el resumen de lectura desde las aplicaciones FIFO persistidas.
 * No redistribuye pagos ni modifica datos.
 */
export function resumenCuotasVentaDesdeAplicaciones(
  venta: VentaLike,
  aplicaciones: PagoAplicacionLike[],
  pagosOverride?: PagoLike[]
) {
  const plan = calcularPlanCuotas(venta, pagosOverride)
  const cuotaMonto = plan[0]?.monto ?? 0
  const pagosPorCuota = new Map<number, number>()

  for (const aplicacion of aplicaciones) {
    const numeroCuota = Number(aplicacion.numeroCuota)
    const montoAplicado = Number(aplicacion.montoAplicado)
    if (!Number.isInteger(numeroCuota) || numeroCuota <= 0 || montoAplicado <= 0) continue
    pagosPorCuota.set(
      numeroCuota,
      Number(((pagosPorCuota.get(numeroCuota) || 0) + montoAplicado).toFixed(2))
    )
  }

  const montoFinanciado = calcularMontoFinanciado(venta, pagosOverride)
  const totalPagado = Number(
    plan
      .reduce(
        (total, cuota) => total + Math.min(pagosPorCuota.get(cuota.numero) || 0, cuota.monto),
        0
      )
      .toFixed(2)
  )
  const saldoPendiente = Number(Math.max(montoFinanciado - totalPagado, 0).toFixed(2))

  let cuotasPagadas = 0
  let proximaCuota: number | null = null
  let montoPendienteCuota = 0

  for (const cuota of plan) {
    const pagado = pagosPorCuota.get(cuota.numero) || 0
    const pendiente = Number(Math.max(cuota.monto - pagado, 0).toFixed(2))
    if (pendiente <= EPSILON) {
      cuotasPagadas++
      continue
    }

    if (!proximaCuota) {
      proximaCuota = cuota.numero
      montoPendienteCuota = Number(Math.min(pendiente, saldoPendiente).toFixed(2))
    }
  }

  if (saldoPendiente <= EPSILON) {
    proximaCuota = null
    montoPendienteCuota = 0
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
  }
}
