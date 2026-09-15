import test from "node:test";
import assert from "node:assert/strict";
import {
  cambiarModoPredio,
  lotesVisiblesParaPredio,
  normalizarCatalogoLotes,
  resolverPrediosSeleccionados,
  seleccionarLoteExistente,
} from "./lotesVenta.js";

const catalogo = normalizarCatalogoLotes({
  lotes: [
    {
      loteId: 1,
      numero: "10",
      area: "285.43",
      medida: "12 x 24",
      estadoDisponibilidad: "disponible",
      disponible: true,
      cantidadVentasActivas: 0,
    },
    {
      loteId: 2,
      numero: "11",
      area: "300",
      medida: null,
      estadoDisponibilidad: "ocupado",
      disponible: false,
      cantidadVentasActivas: 1,
    },
    {
      loteId: 3,
      numero: "12",
      area: "310",
      medida: "15 x 21",
      estadoDisponibilidad: "disponible",
      disponible: true,
      cantidadVentasActivas: 0,
    },
  ],
});

test("normaliza el catálogo y solo acepta disponibilidad consistente", () => {
  const inconsistente = normalizarCatalogoLotes({
    lotes: [
      {
        loteId: 8,
        numero: "18",
        estadoDisponibilidad: "ocupado",
        disponible: true,
        cantidadVentasActivas: 1,
      },
    ],
  });

  assert.equal(catalogo.length, 3);
  assert.deepEqual(catalogo[0], {
    loteId: 1,
    numeroLote: "10",
    areaLote: "285.43",
    medidaLote: "12 x 24",
    estadoDisponibilidad: "disponible",
    disponible: true,
    cantidadVentasActivas: 0,
  });
  assert.equal(inconsistente[0].disponible, false);
});

test("busca por número y excluye lotes elegidos en otros predios", () => {
  const predios = [{ loteId: 1 }, { loteId: null }];

  assert.deepEqual(
    lotesVisiblesParaPredio(catalogo, predios, 1).map((lote) => lote.loteId),
    [2, 3],
  );
  assert.deepEqual(
    lotesVisiblesParaPredio(catalogo, predios, 1, "12").map((lote) => lote.loteId),
    [3],
  );
});

test("selecciona únicamente lotes disponibles y copia datos autoritativos", () => {
  const predios = [
    { numeroLote: "", areaLote: "", medidaLote: "", precio: "" },
    { numeroLote: "", areaLote: "", medidaLote: "", precio: "" },
  ];
  const seleccionados = seleccionarLoteExistente(catalogo, predios, 0, 1);

  assert.deepEqual(seleccionados?.[0], {
    loteId: 1,
    numeroLote: "10",
    areaLote: "285.43",
    medidaLote: "12 x 24",
    precio: "",
    busquedaLote: "",
    modoManual: false,
  });
  assert.equal(seleccionarLoteExistente(catalogo, predios, 0, 2), null);
  assert.equal(seleccionarLoteExistente(catalogo, [{ loteId: 1 }, {}], 1, 1), null);
});

test("revalida todos los lotes y reemplaza datos manipulados por el catálogo", () => {
  const resultado = resolverPrediosSeleccionados(catalogo, [
    {
      loteId: 1,
      numeroLote: "ALTERADO",
      areaLote: "9999",
      medidaLote: "ALTERADA",
      precio: "50000",
    },
    {
      loteId: 3,
      numeroLote: "12",
      areaLote: "310",
      medidaLote: "15 x 21",
      precio: "40000",
    },
  ]);

  assert.equal(resultado.error, null);
  assert.deepEqual(
    resultado.predios.map((predio) => [
      predio.loteId,
      predio.numeroLote,
      predio.areaLote,
      predio.medidaLote,
    ]),
    [
      [1, "10", "285.43", "12 x 24"],
      [3, "12", "310", "15 x 21"],
    ],
  );
});

test("rechaza duplicados y cambios de disponibilidad antes del POST", () => {
  const duplicado = resolverPrediosSeleccionados(catalogo, [
    { loteId: 1, numeroLote: "10" },
    { loteId: 1, numeroLote: "10" },
  ]);
  const ocupado = resolverPrediosSeleccionados(catalogo, [
    { loteId: 2, numeroLote: "11" },
  ]);

  assert.match(duplicado.error, /mismo lote/i);
  assert.equal(duplicado.loteId, 1);
  assert.match(ocupado.error, /no está disponible/i);
  assert.equal(ocupado.loteId, 2);
});

test("conserva un modo legacy explícito para lotes aún no registrados", () => {
  const manual = cambiarModoPredio([{ loteId: 1, numeroLote: "10" }], 0, true);

  assert.deepEqual(manual[0], {
    numeroLote: "",
    areaLote: "",
    medidaLote: "",
    busquedaLote: "",
    modoManual: true,
  });
  manual[0].numeroLote = "NUEVO-99";
  const resultado = resolverPrediosSeleccionados(catalogo, manual);
  assert.equal(resultado.error, null);
  assert.equal(resultado.predios[0].modoManual, true);
});

test("el modo legacy rechaza números ya registrados y duplicados manuales", () => {
  const existente = resolverPrediosSeleccionados(catalogo, [
    { modoManual: true, numeroLote: "10" },
  ]);
  const duplicado = resolverPrediosSeleccionados(catalogo, [
    { modoManual: true, numeroLote: "NUEVO-99" },
    { modoManual: true, numeroLote: "NUEVO-99" },
  ]);

  assert.match(existente.error, /ya existe en el catálogo/i);
  assert.equal(existente.loteId, 1);
  assert.match(duplicado.error, /mismo lote/i);
});
