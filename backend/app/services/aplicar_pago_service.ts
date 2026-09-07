import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import Pago from '#models/pago'
import Prestamo from '#models/prestamo'
import PagoAplicacion from '#models/pago_aplicacion'
import {
  calcularPlanCuotas,
  resumenCuotasVentaDesdeAplicaciones,
} from '#services/cuotas_ventas_service'
import { reconstruirAplicacionesVenta } from '#services/reconstruir_aplicaciones_service'

export type ResultadoAplicacion = {
  pago: Pago
  aplicaciones: Array<{ numeroCuota: number; montoAplicado: number }>
  resumenFinal: ReturnType<typeof resumenCuotasVentaDesdeAplicaciones>
}

/**
 * Motor FIFO unificado para registrar cualquier pago sobre una venta.
 * Cubre cuotas, abonos y pagos parciales con el mismo algoritmo.
 *
 * @param ventaId   ID de la venta en tabla ventas
 * @param monto     Monto a aplicar (> 0 y <= saldo pendiente)
 * @param fechaPago Fecha del pago en formato ISO o DateTime
 * @param usuarioId ID del usuario que registra
 * @param tipoPago  Tipo de pago ('cuota' por defecto; abonos también usan FIFO)
 * @param nota      Nota opcional
 */
export async function aplicarPagoVenta(params: {
  ventaId: number
  monto: number
  fechaPago: string | DateTime
  usuarioId: number | null
  tipoPago?: 'cuota' | 'abono' | 'pago_parcial'
  nota?: string | null
  numeroCuotaReferencia?: number
}): Promise<ResultadoAplicacion> {
  return db.transaction(async (trx) => {
    // 1. Bloquear la venta y sus pagos para escritura (evita concurrencia)
    const venta = await Prestamo.query({ client: trx })
      .where('id', params.ventaId)
      .forUpdate()
      .preload('cliente')
      .preload('lote')
      .preload('predios', (predios) => predios.preload('lote'))
      .preload('pagos')
      .firstOrFail()

    // 2. Normalizar las aplicaciones existentes. Así se incorporan pagos legacy
    // sin modificar sus filas y pago_aplicaciones queda como fuente de cobertura.
    const pagosActivos = venta.pagos.filter((p) => !p.anulado)
    await reconstruirAplicacionesVenta(venta.id, trx)
    const aplicacionesExistentes = await PagoAplicacion.query({ client: trx }).where(
      'venta_id',
      venta.id
    )
    const resumenActual = resumenCuotasVentaDesdeAplicaciones(
      venta,
      aplicacionesExistentes,
      pagosActivos
    )

    // 3. Validaciones
    const monto = Number(Number(params.monto).toFixed(2))
    if (monto <= 0) throw new Error('El monto debe ser mayor a 0')
    if (venta.estado === 'cancelado')
      throw new Error('No se pueden registrar pagos en una venta cancelada')
    if (venta.estado === 'pagado' || resumenActual.saldoPendiente <= 0.005)
      throw new Error('La venta ya no tiene saldo pendiente')
    if (
      params.numeroCuotaReferencia !== undefined &&
      Number(params.numeroCuotaReferencia) !== resumenActual.proximaCuota
    ) {
      throw new Error(`La cuota pendiente actual es la #${resumenActual.proximaCuota}`)
    }
    if (monto - resumenActual.saldoPendiente > 0.005)
      throw new Error(
        `El monto Q${monto} excede el saldo pendiente de Q${resumenActual.saldoPendiente.toFixed(2)}`
      )

    // 4. La cobertura se lee únicamente desde pago_aplicaciones.
    const pagosPorCuota = new Map<number, number>()
    for (const aplicacion of aplicacionesExistentes) {
      const actual = pagosPorCuota.get(aplicacion.numeroCuota) || 0
      pagosPorCuota.set(
        aplicacion.numeroCuota,
        Number((actual + Number(aplicacion.montoAplicado)).toFixed(2))
      )
    }

    // 5. Crear el pago (un solo registro monetario)
    const fechaPago =
      typeof params.fechaPago === 'string' ? DateTime.fromISO(params.fechaPago) : params.fechaPago

    const pago = await Pago.create(
      {
        prestamoId: params.ventaId,
        // Conserva la referencia del endpoint legacy para sus consumidores. La cobertura
        // efectiva siempre se determina por pago_aplicaciones.
        numeroCuota: params.numeroCuotaReferencia ?? 0,
        montoPagado: monto,
        fechaPago,
        usuarioId: params.usuarioId,
        tipoPago: params.tipoPago || 'cuota',
        anulado: false,
      },
      { client: trx }
    )

    // 6. Distribuir FIFO usando la cobertura persistida en pago_aplicaciones.
    const plan = calcularPlanCuotas(venta)

    let restante = monto
    const aplicaciones: Array<{ numeroCuota: number; montoAplicado: number }> = []

    for (const cuota of plan) {
      if (restante <= 0.005) break
      const pagado = pagosPorCuota.get(cuota.numero) || 0
      const pendiente = Number(Math.max(cuota.monto - pagado, 0).toFixed(2))
      if (pendiente <= 0.005) continue // cuota ya completada

      const aplicar = Number(Math.min(restante, pendiente).toFixed(2))
      aplicaciones.push({ numeroCuota: cuota.numero, montoAplicado: aplicar })
      pagosPorCuota.set(cuota.numero, Number((pagado + aplicar).toFixed(2)))
      restante = Number((restante - aplicar).toFixed(2))
    }

    if (restante > 0.005) {
      throw new Error(`No se pudo aplicar Q${restante.toFixed(2)} dentro del plan contractual`)
    }

    // Insertar aplicaciones en pago_aplicaciones
    if (aplicaciones.length > 0) {
      await PagoAplicacion.createMany(
        aplicaciones.map((a) => ({
          pagoId: pago.id,
          ventaId: params.ventaId,
          numeroCuota: a.numeroCuota,
          montoAplicado: a.montoAplicado,
        })),
        { client: trx }
      )
    }

    // 7. Recalcular resumen final y actualizar estado de la venta
    await venta.load('pagos', (q) => q.useTransaction(trx))
    const aplicacionesFinales = await PagoAplicacion.query({ client: trx }).where(
      'venta_id',
      venta.id
    )
    const resumenFinal = resumenCuotasVentaDesdeAplicaciones(
      venta,
      aplicacionesFinales,
      venta.pagos.filter((p) => !p.anulado)
    )

    let nuevoEstado = venta.estado
    if (resumenFinal.saldoPendiente <= 0.005) {
      nuevoEstado = 'pagado'
    } else if (venta.estado === 'pagado') {
      nuevoEstado = 'activo'
    }

    if (nuevoEstado !== venta.estado) {
      venta.estado = nuevoEstado
      await venta.useTransaction(trx).save()
    }

    return { pago, aplicaciones, resumenFinal }
  })
}
