/**
 * app/jobs/marcar_vencidos_job.ts
 *
 * Job que corre diariamente para marcar como "vencido" los préstamos
 * activos cuya fecha_fin ya pasó hace más de 24h.
 *
 * Cómo usarlo:
 * 1. Copiar este archivo a app/jobs/marcar_vencidos_job.ts
 * 2. Crear el comando: node ace make:command MarcarVencidos
 * 3. En el comando generado, llamar a marcarVencidos()
 * 4. Configurar cron en el servidor (ver instrucciones abajo)
 */

import Prestamo from '#models/prestamo'
import { DateTime } from 'luxon'

export async function marcarVencidos() {
  try {
    const ahora = DateTime.now().setZone('America/Guatemala')
    const hoy   = ahora.toISODate()!

    // Préstamos activos cuya fecha_fin ya pasó (ayer o antes)
    const vencidos = await Prestamo.query()
      .where('estado', 'activo')
      .where('fecha_fin', '<', hoy)

    let count = 0
    for (const prestamo of vencidos) {
      prestamo.estado = 'vencido'
      await prestamo.save()
      count++
    }

    console.log(`[MarcarVencidos] ${count} préstamos marcados como vencidos — ${hoy}`)
    return count
  } catch (error) {
    console.error('[MarcarVencidos] Error:', error)
    throw error
  }
}