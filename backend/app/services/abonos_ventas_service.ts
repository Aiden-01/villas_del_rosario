import { DateTime } from 'luxon'
import Pago from '#models/pago'
import Prestamo from '#models/prestamo'

const EPSILON = 0.01

type PagoLike = { numeroCuota: number; montoPagado: number; tipoPago?: string | null }

export type PagoAplicado = {
  pago: Pago
  numeroCuota: number
  monto: number
}

export type ResultadoAbono = {
  venta: Prestamo
  pagos: PagoAplicado[]
  totalAplicado: number
  saldoRestante: number
  ventaPagada: boolean
}

function cuotaMonto(venta: Prestamo) {
  return Number((Number(venta.monto) / Number(venta.cuotas || 1)).toFixed(2))
}

function agruparPagos(pagos: PagoLike[]) {
  const resumen = new Map<number, number>()
  for (const pago of pagos) {
    if (pago.numeroCuota <= 0 || (pago.tipoPago && pago.tipoPago !== 'cuota')) continue

    const actual = resumen.get(pago.numeroCuota) || 0
    resumen.set(pago.numeroCuota, Number((actual + Number(pago.montoPagado)).toFixed(2)))
  }
  return resumen
}

export function resumenCuotasVenta(venta: Prestamo) {
  const montoCuota = cuotaMonto(venta)
  const pagosPorCuota = agruparPagos((venta.pagos || []) as PagoLike[])
  const totalPagado = Number(
    ((venta.pagos || []) as PagoLike[])
      .reduce((sum, pago) => sum + Number(pago.montoPagado || 0), 0)
      .toFixed(2)
  )
  const saldoPendiente = Number(Math.max(Number(venta.monto) - totalPagado, 0).toFixed(2))

  let cuotasPagadas = 0
  let proximaCuota: number | null = null
  let montoPendienteCuota = 0

  for (let cuota = 1; cuota <= Number(venta.cuotas || 0); cuota++) {
    const pagado = pagosPorCuota.get(cuota) || 0
    const pendiente = Number(Math.max(montoCuota - pagado, 0).toFixed(2))
    if (pendiente <= EPSILON) {
      cuotasPagadas++
      continue
    }

    if (!proximaCuota) {
      proximaCuota = cuota
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
    cuotaMonto: montoCuota,
    cuotasPagadas,
    proximaCuota,
    montoPendienteCuota,
    saldoPendiente,
    totalPagado,
    pagosPorCuota,
  }
}

async function actualizarEstadoVenta(venta: Prestamo) {
  await venta.load('pagos')
  const resumen = resumenCuotasVenta(venta)

  if (resumen.saldoPendiente <= EPSILON) {
    venta.estado = 'pagado'
    await venta.save()
  } else if (venta.estado === 'pagado') {
    venta.estado = 'activo'
    await venta.save()
  }

  return resumen
}

export async function aplicarAbonoAVenta(params: {
  ventaId: number
  monto: number
  fechaPago: string | DateTime
  usuarioId: number | null
  tipoPago?: 'abono' | 'enganche'
}): Promise<ResultadoAbono> {
  const venta = await Prestamo.query()
    .where('id', params.ventaId)
    .preload('cliente')
    .preload('lote')
    .preload('pagos')
    .firstOrFail()

  const montoSolicitado = Number(params.monto)
  if (montoSolicitado <= 0) {
    throw new Error('El monto del abono debe ser mayor a 0')
  }

  const resumenInicial = resumenCuotasVenta(venta)
  if (resumenInicial.saldoPendiente <= EPSILON) {
    throw new Error('La venta ya no tiene saldo pendiente')
  }

  if (montoSolicitado - resumenInicial.saldoPendiente > EPSILON) {
    throw new Error(`El abono excede el saldo pendiente de Q${resumenInicial.saldoPendiente}`)
  }

  const monto =
    montoSolicitado > resumenInicial.saldoPendiente
      ? resumenInicial.saldoPendiente
      : montoSolicitado

  const fechaPago =
    typeof params.fechaPago === 'string' ? DateTime.fromISO(params.fechaPago) : params.fechaPago

  const tipoPago = params.tipoPago || 'abono'
  const pago = await Pago.create({
    prestamoId: venta.id,
    numeroCuota: 0,
    montoPagado: monto,
    fechaPago,
    usuarioId: params.usuarioId,
    tipoPago,
  })

  const resumenFinal = await actualizarEstadoVenta(venta)

  return {
    venta,
    pagos: [{ pago, numeroCuota: 0, monto }],
    totalAplicado: monto,
    saldoRestante: resumenFinal.saldoPendiente,
    ventaPagada: resumenFinal.saldoPendiente <= EPSILON,
  }
}
