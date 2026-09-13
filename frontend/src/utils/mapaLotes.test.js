import test from "node:test";
import assert from "node:assert/strict";
import {
  ESTADOS_MAPA,
  crearDetalleLote,
  obtenerEstadoMapa,
} from "./mapaLotes.js";

test("define una presentacion diferenciada para cada estado del mapa", () => {
  assert.deepEqual(Object.keys(ESTADOS_MAPA), [
    "disponible",
    "vendido",
    "mora",
    "pagado",
    "conflicto",
  ]);

  const colores = Object.values(ESTADOS_MAPA).map(({ color }) => color);
  assert.equal(new Set(colores).size, 5);
  assert.deepEqual(obtenerEstadoMapa("disponible"), {
    etiqueta: "Disponible",
    color: "#22c55e",
  });
  assert.deepEqual(obtenerEstadoMapa("conflicto"), {
    etiqueta: "Conflicto",
    color: "#f59e0b",
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
    const detalle = crearDetalleLote({
      properties: {
        numero: "10",
        estadoMapa,
        cliente: null,
        resumenFinanciero: null,
      },
    });

    assert.equal(detalle.mostrarVender, estadoMapa === "disponible");
    assert.equal(detalle.cliente, null);
    assert.equal(detalle.resumenFinanciero, null);
    assert.equal(detalle.fraccion, null);
    assert.equal(detalle.saldoPendiente, null);
    assert.equal(detalle.enMora, null);
    assert.equal(detalle.diasAtraso, null);
  }
});
