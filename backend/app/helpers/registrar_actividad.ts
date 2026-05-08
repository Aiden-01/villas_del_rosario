import Actividad from '#models/actividad'

export async function registrarActividad({
  usuarioId,
  tipo,
  entidad,
  entidadId,
  descripcion,
  detalle,
}: {
  usuarioId: number | null
  tipo: 'crear' | 'actualizar' | 'eliminar' | 'pago' | 'login'
  entidad: 'cliente' | 'prestamo' | 'pago' | 'ruta' | 'usuario'
  entidadId?: number | null
  descripcion: string
  detalle?: object | null
}) {
  try {
    await Actividad.create({
      usuarioId,
      tipo,
      entidad,
      entidadId: entidadId || null,
      descripcion,
      detalle: detalle || null,
    })
  } catch (error) {
    console.error('Error registrando actividad:', error)
  }
}
