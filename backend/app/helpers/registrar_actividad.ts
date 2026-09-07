import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import Actividad from '#models/actividad'

export async function registrarActividad({
  usuarioId,
  tipo,
  entidad,
  entidadId,
  descripcion,
  detalle,
  trx,
}: {
  usuarioId: number | null
  tipo: 'crear' | 'actualizar' | 'eliminar' | 'pago' | 'login'
  entidad: 'cliente' | 'prestamo' | 'pago' | 'ruta' | 'usuario'
  entidadId?: number | null
  descripcion: string
  detalle?: object | null
  trx?: TransactionClientContract
}) {
  try {
    await Actividad.create(
      {
        usuarioId,
        tipo,
        entidad,
        entidadId: entidadId || null,
        descripcion,
        detalle: detalle || null,
      },
      trx ? { client: trx } : {}
    )
  } catch (error) {
    if (trx) throw error
    console.error('Error registrando actividad:', error)
  }
}
