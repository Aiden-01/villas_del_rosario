export const VISTA_INICIAL_MAPA = Object.freeze({
  centro: Object.freeze([16.49518, -89.41827]),
  zoom: 18,
  maxZoom: 22,
  maxNativeZoom: 19,
  maxZoomAjuste: 21,
  zoomSnap: 0.25,
  zoomDelta: 0.25,
});

export function obtenerPaddingAjusteMapa(anchoMapa) {
  if (anchoMapa <= 430) return 8;
  if (anchoMapa <= 768) return 12;
  return 16;
}

export const ESTADOS_MAPA = Object.freeze({
  disponible: Object.freeze({ etiqueta: "Disponible", color: "#22c55e" }),
  vendido: Object.freeze({ etiqueta: "Vendido", color: "#3b82f6" }),
  mora: Object.freeze({ etiqueta: "Mora", color: "#ef4444" }),
  pagado: Object.freeze({ etiqueta: "Pagado", color: "#8b5cf6" }),
  conflicto: Object.freeze({ etiqueta: "Conflicto", color: "#f59e0b" }),
});

export function obtenerEstadoMapa(estado) {
  return ESTADOS_MAPA[estado] ?? null;
}

export function crearDetalleLote(feature) {
  const properties = feature?.properties ?? {};
  const resumenFinanciero = properties.resumenFinanciero;

  return {
    ...properties,
    properties,
    etiqueta: properties.numero == null ? "Lote" : `Lote ${properties.numero}`,
    mostrarVender: properties.estadoMapa === "disponible",
    cliente: properties.cliente,
    resumenFinanciero,
    fraccion: resumenFinanciero?.fraccion ?? null,
    saldoPendiente: resumenFinanciero?.saldoPendiente ?? null,
    enMora: resumenFinanciero?.enMora ?? null,
    diasAtraso: resumenFinanciero?.diasAtraso ?? null,
  };
}
