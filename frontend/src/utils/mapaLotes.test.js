import test from "node:test";
import assert from "node:assert/strict";
import {
  ESTADOS_MAPA,
  VISTA_INICIAL_MAPA,
  crearRutaVentaDesdeMapa,
  crearDetalleLote,
  errorInvalidaPreseleccionLoteMapa,
  limpiarPreseleccionLoteMapa,
  obtenerEstadoMapa,
  obtenerPaddingAjusteMapa,
  parsearLoteIdMapa,
  resolverLoteVentaDesdeMapa,
} from "./mapaLotes.js";

test("inicia enfocado en el proyecto Villas del Rosario", () => {
  assert.deepEqual(VISTA_INICIAL_MAPA, {
    centro: [16.49518, -89.41827],
    zoom: 18,
    maxZoom: 22,
    maxNativeZoom: 19,
    maxZoomAjuste: 21,
    zoomSnap: 0.25,
    zoomDelta: 0.25,
  });
});

test("elige el padding segun el ancho real del contenedor del mapa", () => {
  assert.equal(obtenerPaddingAjusteMapa(320), 8);
  assert.equal(obtenerPaddingAjusteMapa(360), 8);
  assert.equal(obtenerPaddingAjusteMapa(390), 8);
  assert.equal(obtenerPaddingAjusteMapa(430), 8);
  assert.equal(obtenerPaddingAjusteMapa(431), 12);
  assert.equal(obtenerPaddingAjusteMapa(768), 12);
  assert.equal(obtenerPaddingAjusteMapa(769), 16);
  assert.equal(obtenerPaddingAjusteMapa(1280), 16);
});

test("define una presentacion diferenciada para cada estado del mapa", () => {
  assert.deepEqual(Object.keys(ESTADOS_MAPA), [
    "disponible",
    "no_autorizado",
    "vendido",
    "mora",
    "pagado",
    "conflicto",
  ]);

  const colores = Object.values(ESTADOS_MAPA).map(({ color }) => color);
  assert.equal(new Set(colores).size, 6);
  assert.deepEqual(obtenerEstadoMapa("disponible"), {
    etiqueta: "Disponible",
    color: "#22c55e",
  });
  assert.deepEqual(obtenerEstadoMapa("conflicto"), {
    etiqueta: "Conflicto",
    color: "#f59e0b",
  });
  assert.deepEqual(obtenerEstadoMapa("no_autorizado"), {
    etiqueta: "No autorizado",
    color: "#64748b",
  });
  assert.equal(obtenerEstadoMapa("desconocido"), null);
});

test("crea el detalle copiando literalmente cliente y resumen financiero del backend", () => {
  const cliente = { id: 8, nombres: "Maria", apellidos: "Rosario" };
  const resumenFinanciero = {
    cuotasPagadas: 1,
    cuotasContractuales: 36,
    fraccion: "5/36",
    saldoPendiente: 142_847.22,
    enMora: true,
    diasAtraso: 17,
  };
  const properties = {
    loteId: 13,
    codigo: "VR-Z3-L013",
    numero: "13",
    area: 285.43,
    estadoMapa: "mora",
    ventaId: 21,
    cliente,
    resumenFinanciero,
  };

  const detalle = crearDetalleLote({
    type: "Feature",
    geometry: { type: "Polygon", coordinates: [] },
    properties,
  });

  assert.equal(detalle.properties, properties);
  assert.equal(detalle.cliente, cliente);
  assert.equal(detalle.resumenFinanciero, resumenFinanciero);
  assert.equal(detalle.etiqueta, "Lote 13");
  assert.equal(detalle.fraccion, "5/36");
  assert.equal(detalle.saldoPendiente, 142_847.22);
  assert.equal(detalle.enMora, true);
  assert.equal(detalle.diasAtraso, 17);
  assert.equal(detalle.mostrarVender, false);
});

test("muestra Vender exclusivamente para lotes disponibles", () => {
  for (const estadoMapa of Object.keys(ESTADOS_MAPA)) {
    const feature = {
      properties: {
        loteId: 10,
        numero: "10",
        estadoMapa,
        habilitadoVenta: estadoMapa === "disponible",
        ventaId: ["disponible", "no_autorizado"].includes(estadoMapa) ? null : 99,
        cliente: null,
        resumenFinanciero: null,
      },
    };
    const detalle = crearDetalleLote(feature);

    assert.equal(detalle.mostrarVender, estadoMapa === "disponible");
    assert.equal(detalle.ventaNoAutorizada, estadoMapa === "no_autorizado");
    assert.equal(
      crearRutaVentaDesdeMapa(feature),
      estadoMapa === "disponible" ? "/ventas/crear?loteId=10" : null,
    );
    assert.equal(detalle.cliente, null);
    assert.equal(detalle.resumenFinanciero, null);
    assert.equal(detalle.fraccion, null);
    assert.equal(detalle.saldoPendiente, null);
    assert.equal(detalle.enMora, null);
    assert.equal(detalle.diasAtraso, null);
  }
});

test("acepta unicamente identificadores enteros positivos para ventas desde el mapa", () => {
  assert.equal(parsearLoteIdMapa("13"), 13);
  assert.equal(parsearLoteIdMapa(13), 13);

  for (const valor of [null, "", "0", "-1", "1.5", "13abc"]) {
    assert.equal(parsearLoteIdMapa(valor), null);
  }
});

test("resuelve la preseleccion exclusivamente por loteId y datos autoritativos", () => {
  const coleccion = {
    type: "FeatureCollection",
    features: [
      {
        properties: {
          loteId: 13,
          codigo: "VR-Z3-L013",
          numero: "13",
          medida: "12 x 24",
          area: 285.43,
          estadoMapa: "disponible",
          habilitadoVenta: true,
          ventaId: null,
        },
      },
    ],
  };

  assert.deepEqual(resolverLoteVentaDesdeMapa(coleccion, "13"), {
    lote: {
      loteId: 13,
      codigo: "VR-Z3-L013",
      numeroLote: "13",
      medidaLote: "12 x 24",
      areaLote: "285.43",
    },
    error: null,
  });
  assert.match(resolverLoteVentaDesdeMapa(coleccion, "999").error, /ya no existe/);
});

test("invalida la preseleccion cuando el backend cambia el estado del lote", () => {
  for (const estadoMapa of [
    "no_autorizado",
    "vendido",
    "pagado",
    "mora",
    "conflicto",
  ]) {
    const resultado = resolverLoteVentaDesdeMapa(
      {
        type: "FeatureCollection",
        features: [
          {
            properties: {
              loteId: 13,
              numero: "13",
              area: 285.43,
              estadoMapa,
              habilitadoVenta: false,
              ventaId: ["no_autorizado", "conflicto"].includes(estadoMapa) ? null : 20,
              conflictoIntegridad: estadoMapa === "conflicto",
            },
          },
        ],
      },
      "13",
    );

    assert.equal(resultado.lote, null);
    assert.match(resultado.error, /ya no está disponible/);
  }
});

test("invalida inconsistencias aunque el estado nominal sea disponible", () => {
  for (const properties of [
    {
      loteId: 13,
      numero: "13",
      estadoMapa: "disponible",
      habilitadoVenta: true,
      ventaId: 20,
    },
    {
      loteId: 13,
      numero: "13",
      estadoMapa: "disponible",
      habilitadoVenta: true,
      ventaId: null,
      conflictoIntegridad: true,
    },
  ]) {
    const feature = { properties };
    const resultado = resolverLoteVentaDesdeMapa(
      { type: "FeatureCollection", features: [feature] },
      "13",
    );

    assert.equal(crearRutaVentaDesdeMapa(feature), null);
    assert.equal(resultado.lote, null);
    assert.match(resultado.error, /ya no está disponible/);
  }
});

test("no habilita Vender si falta autorización comercial explícita", () => {
  const feature = {
    properties: {
      loteId: 13,
      numero: "13",
      estadoMapa: "disponible",
      habilitadoVenta: false,
      ventaId: null,
    },
  };

  const detalle = crearDetalleLote(feature);
  assert.equal(detalle.mostrarVender, false);
  assert.equal(detalle.ventaNoAutorizada, true);
  assert.equal(crearRutaVentaDesdeMapa(feature), null);
  assert.equal(resolverLoteVentaDesdeMapa(
    { type: "FeatureCollection", features: [feature] },
    13,
  ).lote, null);
});

test("rechaza un numero de lote vacio aunque el loteId sea valido", () => {
  const resultado = resolverLoteVentaDesdeMapa(
    {
      type: "FeatureCollection",
      features: [
        {
          properties: {
            loteId: 13,
            numero: "   ",
            estadoMapa: "disponible",
            habilitadoVenta: true,
            ventaId: null,
          },
        },
      ],
    },
    "13",
  );

  assert.equal(resultado.lote, null);
  assert.match(resultado.error, /número válido/);
});

test("limpia solamente la preseleccion vinculada al mapa", () => {
  const formulario = {
    loteId: 13,
    clienteId: "8",
    numeroLote: "13",
    medidaLote: "12 x 24",
    areaLote: "285.43",
    predios: [
      {
        loteId: 13,
        codigo: "VR-Z3-L013",
        numeroLote: "13",
        medidaLote: "12 x 24",
        areaLote: "285.43",
        precio: "100000",
      },
      {
        numeroLote: "14",
        medidaLote: "10 x 20",
        areaLote: "200",
        precio: "80000",
      },
    ],
  };

  assert.deepEqual(limpiarPreseleccionLoteMapa(formulario), {
    clienteId: "8",
    numeroLote: "",
    medidaLote: "",
    areaLote: "",
    predios: [
      {
        numeroLote: "",
        medidaLote: "",
        areaLote: "",
        precio: "100000",
      },
      {
        numeroLote: "14",
        medidaLote: "10 x 20",
        areaLote: "200",
        precio: "80000",
      },
    ],
  });

  const formularioManual = { predios: [{ numeroLote: "15" }] };
  assert.equal(limpiarPreseleccionLoteMapa(formularioManual), formularioManual);
});

test("atribuye el error exclusivamente al lote preseleccionado", () => {
  assert.equal(
    errorInvalidaPreseleccionLoteMapa(
      { status: 409, data: { loteId: 13 } },
      13,
    ),
    true,
  );
  assert.equal(
    errorInvalidaPreseleccionLoteMapa(
      { status: 409, data: { loteId: 14 } },
      13,
    ),
    false,
  );
  assert.equal(
    errorInvalidaPreseleccionLoteMapa({ status: 409, data: {} }, 13),
    false,
  );
  assert.equal(
    errorInvalidaPreseleccionLoteMapa(
      { status: 500, data: { loteId: 13 } },
      13,
    ),
    false,
  );
});
