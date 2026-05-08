import Prestamo from '#models/prestamo'
import { DateTime } from 'luxon'

export async function marcarVencidos() {
  try {
    const ahora = DateTime.now().setZone('America/Guatemala')
    const hoy = ahora.toISODate()!

    const vencidos = await Prestamo.query().where('estado', 'activo').where('fecha_fin', '<', hoy)

    let count = 0
    for (const prestamo of vencidos) {
      prestamo.estado = 'vencido'
      await prestamo.save()
      count++
    }

    console.log(`[MarcarVencidos] ${count} ventas marcadas como vencidas - ${hoy}`)
    return count
  } catch (error) {
    console.error('[MarcarVencidos] Error:', error)
    throw error
  }
}
