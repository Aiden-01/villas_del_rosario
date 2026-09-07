import db from '@adonisjs/lucid/services/db'
import Prestamo from '#models/prestamo'
import PagoAplicacion from '#models/pago_aplicacion'
import { distribuirPagosFIFO } from '#services/cuotas_ventas_service'

export type ResultadoReconstruccion = {
  ventaId: number
  aplicacionesEliminadas: number
  aplicacionesCreadas: number
  anomalias: string[]
}

/**
 * Reconstruye determinísticamente las aplicaciones FIFO de una venta.
 * Idempotente: puede ejecutarse múltiples veces sin duplicar datos.
 * NO modifica los registros originales de pagos, solo la tabla pago_aplicaciones.
 *
 * @param ventaId ID de la venta a reconstruir
 * @param trx     Transacción externa opcional (si se proporciona, se usa esa)
 */
export async function reconstruirAplicacionesVenta(
  ventaId: number,
  trx?: any
): Promise<ResultadoReconstruccion> {
  const run = async (client: any) => {
    const anomalias: string[] = []

    // Cargar venta con pagos no anulados, ordenados determinísticamente
    const venta = await Prestamo.query({ client })
      .where('id', ventaId)
      .forUpdate()
      .preload('pagos', (q) =>
        q
          .where('anulado', false)
          .orderBy('fecha_pago', 'asc')
          .orderBy('created_at', 'asc')
          .orderBy('id', 'asc')
      )
      .firstOrFail()

    const distribucion = distribuirPagosFIFO(venta)
    anomalias.push(...distribucion.anomalias)
    const eliminadasResult = await PagoAplicacion.query({ client })
      .where('venta_id', ventaId)
      .delete()
    const aplicaciones = distribucion.aplicaciones.map((a) => ({ ...a, ventaId }))
    if (aplicaciones.length) await PagoAplicacion.createMany(aplicaciones, { client })
    const creadas = aplicaciones.length

    return {
      ventaId,
      aplicacionesEliminadas: Number(eliminadasResult) || 0,
      aplicacionesCreadas: creadas,
      anomalias,
    }
  }

  if (trx) {
    return run(trx)
  } else {
    return db.transaction(run)
  }
}

/**
 * Reconstruye las aplicaciones de TODAS las ventas activas.
 * Útil para backfill inicial al migrar a la nueva tabla pago_aplicaciones.
 * Ejecuta una transacción por venta para limitar el impacto de fallos.
 */
export async function reconstruirAplicacionesTodasLasVentas(): Promise<{
  total: number
  exitosas: number
  fallidas: number
  anomalias: string[]
}> {
  const ventas = await Prestamo.query().select('id').orderBy('id', 'asc')
  let exitosas = 0
  let fallidas = 0
  const anomaliasGlobal: string[] = []

  for (const venta of ventas) {
    try {
      const resultado = await reconstruirAplicacionesVenta(venta.id)
      exitosas++
      anomaliasGlobal.push(...resultado.anomalias)
    } catch (error: any) {
      fallidas++
      anomaliasGlobal.push(`Venta ${venta.id} FALLÓ: ${error.message}`)
    }
  }

  return { total: ventas.length, exitosas, fallidas, anomalias: anomaliasGlobal }
}
