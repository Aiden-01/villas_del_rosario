import { parsearLoteIdMapa } from "./mapaLotes.js";

const ESTADOS_DISPONIBILIDAD = new Set(["disponible", "ocupado", "conflicto"]);

export function normalizarCatalogoLotes(respuesta) {
  if (!Array.isArray(respuesta?.lotes)) return [];

  return respuesta.lotes.flatMap((item) => {
    const loteId = parsearLoteIdMapa(item?.loteId);
    const numeroLote = String(item?.numero ?? "").trim();
    if (!loteId || !numeroLote) return [];

    const cantidadVentasActivas = Number(item?.cantidadVentasActivas ?? 0);
    const estadoDisponibilidad = ESTADOS_DISPONIBILIDAD.has(item?.estadoDisponibilidad)
      ? item.estadoDisponibilidad
      : "ocupado";
    const disponible =
      item?.disponible === true &&
      estadoDisponibilidad === "disponible" &&
      cantidadVentasActivas === 0;

    return [
      {
        loteId,
        numeroLote,
        areaLote: item?.area == null ? "" : String(item.area),
        medidaLote: item?.medida == null ? "" : String(item.medida),
        estadoDisponibilidad,
        disponible,
        cantidadVentasActivas,
      },
    ];
  });
}

export function lotesVisiblesParaPredio(catalogo, predios, indice, busqueda = "") {
  const loteActual = parsearLoteIdMapa(predios[indice]?.loteId);
  const seleccionadosEnOtros = new Set(
    predios
      .filter((_, predioIndex) => predioIndex !== indice)
      .map((predio) => parsearLoteIdMapa(predio?.loteId))
      .filter(Boolean),
  );
  const termino = String(busqueda).trim().toLowerCase();

  return catalogo.filter(
    (lote) =>
      !seleccionadosEnOtros.has(lote.loteId) &&
      (!termino || lote.loteId === loteActual || lote.numeroLote.toLowerCase().includes(termino)),
  );
}

export function seleccionarLoteExistente(catalogo, predios, indice, loteIdRecibido) {
  const loteId = parsearLoteIdMapa(loteIdRecibido);
  const lote = catalogo.find((item) => item.loteId === loteId);
  const repetido = predios.some(
    (predio, predioIndex) =>
      predioIndex !== indice && parsearLoteIdMapa(predio?.loteId) === loteId,
  );

  if (!loteId || !lote || !lote.disponible || repetido) return null;

  return predios.map((predio, predioIndex) =>
    predioIndex === indice
      ? {
          ...predio,
          loteId: lote.loteId,
          numeroLote: lote.numeroLote,
          areaLote: lote.areaLote,
          medidaLote: lote.medidaLote,
          busquedaLote: "",
          modoManual: false,
        }
      : predio,
  );
}

export function cambiarModoPredio(predios, indice, modoManual) {
  return predios.map((predio, predioIndex) => {
    if (predioIndex !== indice) return predio;

    const { loteId: _loteId, ...resto } = predio;
    void _loteId;
    return {
      ...resto,
      numeroLote: "",
      areaLote: "",
      medidaLote: "",
      busquedaLote: "",
      modoManual,
    };
  });
}

export function resolverPrediosSeleccionados(catalogo, predios) {
  const ids = new Set();
  const numeros = new Set();
  const resultado = [];

  for (let index = 0; index < predios.length; index += 1) {
    const predio = predios[index];
    if (predio.modoManual) {
      const numeroLote = String(predio.numeroLote ?? "").trim();
      if (!numeroLote) {
        return {
          predios: null,
          error: `Escribe el número del lote no registrado del predio ${index + 1}.`,
          loteId: null,
        };
      }

      const loteExistente = catalogo.find((lote) => lote.numeroLote === numeroLote);
      if (loteExistente) {
        return {
          predios: null,
          error: `El lote ${numeroLote} ya existe en el catálogo. Selecciónalo en la lista.`,
          loteId: loteExistente.loteId,
        };
      }
      if (numeros.has(numeroLote)) {
        return {
          predios: null,
          error: "No se puede agregar el mismo lote más de una vez.",
          loteId: null,
        };
      }

      numeros.add(numeroLote);
      resultado.push({ ...predio, numeroLote });
      continue;
    }

    const loteId = parsearLoteIdMapa(predio.loteId);
    if (!loteId) {
      return { predios: null, error: `Selecciona el lote del predio ${index + 1}.`, loteId: null };
    }
    if (ids.has(loteId)) {
      return {
        predios: null,
        error: "No se puede seleccionar el mismo lote más de una vez.",
        loteId,
      };
    }

    const lote = catalogo.find((item) => item.loteId === loteId);
    if (!lote || !lote.disponible) {
      return {
        predios: null,
        error: `El lote ${predio.numeroLote || loteId} ya no está disponible.`,
        loteId,
      };
    }

    if (numeros.has(lote.numeroLote)) {
      return {
        predios: null,
        error: "No se puede agregar el mismo lote más de una vez.",
        loteId,
      };
    }

    ids.add(loteId);
    numeros.add(lote.numeroLote);
    resultado.push({
      ...predio,
      loteId,
      numeroLote: lote.numeroLote,
      areaLote: lote.areaLote,
      medidaLote: lote.medidaLote,
      modoManual: false,
    });
  }

  return { predios: resultado, error: null, loteId: null };
}
