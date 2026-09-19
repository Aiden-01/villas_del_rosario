export function loteIdsAsociadosVenta(venta) {
    if (venta.predios?.length) {
        return [...new Set(venta.predios.flatMap((predio) => (predio.loteId ? [predio.loteId] : [])))];
    }
    return venta.loteId ? [venta.loteId] : [];
}
export function agruparVentasActivasPorLote(ventas) {
    const ventasPorLote = new Map();
    for (const venta of ventas) {
        for (const loteId of loteIdsAsociadosVenta(venta)) {
            const asociaciones = ventasPorLote.get(loteId) || [];
            asociaciones.push(venta);
            ventasPorLote.set(loteId, asociaciones);
        }
    }
    return ventasPorLote;
}
export function estadoDisponibilidadLote(cantidadVentasActivas, habilitadoVenta) {
    if (cantidadVentasActivas > 1)
        return 'conflicto';
    if (cantidadVentasActivas === 1)
        return 'ocupado';
    return habilitadoVenta ? 'disponible' : 'no_autorizado';
}
//# sourceMappingURL=lotes_disponibilidad_service.js.map