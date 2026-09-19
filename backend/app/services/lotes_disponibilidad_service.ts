type VentaConLotes = {
  loteId: number | null
  predios?: Array<{ loteId: number | null }>
}

export type EstadoDisponibilidadLote = 'disponible' | 'no_autorizado' | 'ocupado' | 'conflicto'

export function loteIdsAsociadosVenta(venta: VentaConLotes) {
  if (venta.predios?.length) {
    return [...new Set(venta.predios.flatMap((predio) => (predio.loteId ? [predio.loteId] : [])))]
  }

  return venta.loteId ? [venta.loteId] : []
}

export function agruparVentasActivasPorLote<T extends VentaConLotes>(ventas: T[]) {
  const ventasPorLote = new Map<number, T[]>()

  for (const venta of ventas) {
    for (const loteId of loteIdsAsociadosVenta(venta)) {
      const asociaciones = ventasPorLote.get(loteId) || []
      asociaciones.push(venta)
      ventasPorLote.set(loteId, asociaciones)
    }
  }

  return ventasPorLote
}

export function estadoDisponibilidadLote(
  cantidadVentasActivas: number,
  habilitadoVenta: boolean
): EstadoDisponibilidadLote {
  if (cantidadVentasActivas > 1) return 'conflicto'
  if (cantidadVentasActivas === 1) return 'ocupado'
  return habilitadoVenta ? 'disponible' : 'no_autorizado'
}
