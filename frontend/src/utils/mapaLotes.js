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
  no_autorizado: Object.freeze({ etiqueta: "No autorizado", color: "#64748b" }),
  vendido: Object.freeze({ etiqueta: "Vendido", color: "#3b82f6" }),
  mora: Object.freeze({ etiqueta: "Mora", color: "#ef4444" }),
  pagado: Object.freeze({ etiqueta: "Pagado", color: "#8b5cf6" }),
  conflicto: Object.freeze({ etiqueta: "Conflicto", color: "#f59e0b" }),
});

export function obtenerEstadoMapa(estado) {
  return ESTADOS_MAPA[estado] ?? null;
}

export function parsearLoteIdMapa(valor) {
  const texto = String(valor ?? "").trim();
  if (!/^[1-9]\d*$/.test(texto)) return null;

  const loteId = Number(texto);
  return Number.isSafeInteger(loteId) ? loteId : null;
}

export function limpiarPreseleccionLoteMapa(formData) {
  const predios = Array.isArray(formData?.predios) ? formData.predios : [];
  const loteId =
    parsearLoteIdMapa(formData?.loteId) ??
    parsearLoteIdMapa(predios[0]?.loteId);

  if (!loteId) return formData;

  const prediosLimpios = predios.map((predio, index) => {
    if (index !== 0 || parsearLoteIdMapa(predio?.loteId) !== loteId) {
      return predio;
    }

    const { loteId: _loteId, codigo: _codigo, ...resto } = predio;
    void _loteId;
    void _codigo;
    return {
      ...resto,
      numeroLote: "",
      medidaLote: "",
      areaLote: "",
    };
  });
  const principal = prediosLimpios[0] ?? {};
  const { loteId: _loteId, ...restoFormulario } = formData;
  void _loteId;

  return {
    ...restoFormulario,
    numeroLote: principal.numeroLote ?? "",
    medidaLote: principal.medidaLote ?? "",
    areaLote: principal.areaLote ?? "",
    predios: prediosLimpios,
  };
}

export function errorInvalidaPreseleccionLoteMapa(error, loteIdPreseleccionado) {
  const loteId = parsearLoteIdMapa(loteIdPreseleccionado);
  const loteIdError = parsearLoteIdMapa(error?.data?.loteId);
  const status = Number(error?.status);

  return (
    Boolean(loteId) &&
    Boolean(loteIdError) &&
    loteId === loteIdError &&
    [400, 404, 409].includes(status)
  );
}

function esLoteDisponibleParaVenta(properties, loteId) {
  return (
    Boolean(loteId) &&
    parsearLoteIdMapa(properties?.loteId) === loteId &&
    properties?.habilitadoVenta === true &&
    properties?.estadoMapa === "disponible" &&
    properties?.ventaId == null &&
    properties?.conflictoIntegridad !== true
  );
}

export function crearRutaVentaDesdeMapa(feature) {
  const loteId = parsearLoteIdMapa(feature?.properties?.loteId);
  if (!loteId || !esLoteDisponibleParaVenta(feature?.properties, loteId)) {
    return null;
  }

  return `/ventas/crear?loteId=${encodeURIComponent(loteId)}`;
}

export function resolverLoteVentaDesdeMapa(coleccion, loteIdRecibido) {
  const loteId = parsearLoteIdMapa(loteIdRecibido);
  if (!loteId) {
    return {
      lote: null,
      error: "El identificador del lote seleccionado no es válido.",
    };
  }

  const feature = coleccion?.features?.find(
    (item) => parsearLoteIdMapa(item?.properties?.loteId) === loteId,
  );
  if (!feature) {
    return {
      lote: null,
      error: "El lote seleccionado ya no existe en el mapa actual.",
    };
  }

  const properties = feature.properties;
  if (!esLoteDisponibleParaVenta(properties, loteId)) {
    return {
      lote: null,
      error: "El lote seleccionado ya no está disponible para venta.",
    };
  }

  const numeroLote = String(properties.numero ?? "").trim();
  if (!numeroLote) {
    return {
      lote: null,
      error: "El lote seleccionado no tiene un número válido.",
    };
  }

  return {
    lote: {
      loteId,
      codigo: properties.codigo || "",
      numeroLote,
      medidaLote: properties.medida ? String(properties.medida) : "",
      areaLote:
        properties.area === null || properties.area === undefined
          ? ""
          : String(properties.area),
    },
    error: null,
  };
}

export function crearDetalleLote(feature) {
  const properties = feature?.properties ?? {};
  const resumenFinanciero = properties.resumenFinanciero;

  return {
    ...properties,
    properties,
    etiqueta: properties.numero == null ? "Lote" : `Lote ${properties.numero}`,
    mostrarVender: esLoteDisponibleParaVenta(
      properties,
      parsearLoteIdMapa(properties.loteId),
    ),
    ventaNoAutorizada:
      properties.estadoMapa === "no_autorizado" ||
      (properties.estadoMapa === "disponible" && properties.habilitadoVenta !== true),
    cliente: properties.cliente,
    resumenFinanciero,
    fraccion: resumenFinanciero?.fraccion ?? null,
    saldoPendiente: resumenFinanciero?.saldoPendiente ?? null,
    enMora: resumenFinanciero?.enMora ?? null,
    diasAtraso: resumenFinanciero?.diasAtraso ?? null,
  };
}
