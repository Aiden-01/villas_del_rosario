import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  CAPAS_TEXTO_MAPA,
  cargarCapaTexto,
  prepararCapaTexto,
  prepararEtiquetaCartografica,
} from "./mapaTextos.js";

test("define las tres capas con la visibilidad inicial solicitada", () => {
  assert.deepEqual(
    Object.entries(CAPAS_TEXTO_MAPA).map(([id, capa]) => [
      id,
      capa.etiqueta,
      capa.visibleInicial,
      capa.url,
    ]),
    [
      ["lotes", "Números y áreas", true, "/geo/lotes_textos.geojson"],
      [
        "colindancias",
        "Colindancias",
        true,
        "/geo/colindancias_textos.geojson",
      ],
      ["cotas", "Medidas", false, "/geo/cotas_textos.geojson"],
    ],
  );
});

test("usa STRING, TEXT_ANGLE y HEIGHT e ignora TEXTSTRING", () => {
  const etiqueta = prepararEtiquetaCartografica({
    type: "Feature",
    geometry: { type: "Point", coordinates: [-89.4181, 16.4952, 0] },
    properties: {
      STRING: "LOTE NO. 10\\n285.43m",
      TEXTSTRING: "ESTE TEXTO NO DEBE USARSE",
      TEXT_ANGLE: 27.5,
      HEIGHT: 0.8,
    },
  });

  assert.deepEqual(etiqueta, {
    posicion: [16.4952, -89.4181],
    texto: "LOTE NO. 10\n285.43m",
    angulo: 27.5,
    rotacionCss: -27.5,
    altura: 0.8,
    tamanoFuente: 11.2,
  });
});

test("rechaza una capa inválida sin producir etiquetas parciales", () => {
  assert.throws(
    () =>
      prepararCapaTexto({
        type: "FeatureCollection",
        features: [
          {
            geometry: { type: "Point", coordinates: [-89.4, 16.4, 0] },
            properties: { STRING: "Válida", TEXT_ANGLE: 0, HEIGHT: 1 },
          },
          {
            geometry: { type: "LineString", coordinates: [] },
            properties: { STRING: "Inválida", TEXT_ANGLE: 0, HEIGHT: 1 },
          },
        ],
      }),
    /Etiqueta cartográfica inválida/,
  );
});

test("procesa completos los tres archivos estáticos publicados", async () => {
  const archivos = [
    ["lotes_textos.geojson", 12, 11.2],
    ["colindancias_textos.geojson", 3, 14],
    ["cotas_textos.geojson", 34, 12],
  ];

  for (const [archivo, cantidad, tamanoFuente] of archivos) {
    const contenido = await readFile(
      new URL(`../../public/geo/${archivo}`, import.meta.url),
      "utf8",
    );
    const etiquetas = prepararCapaTexto(JSON.parse(contenido));

    assert.equal(etiquetas.length, cantidad);
    assert.ok(etiquetas.every((etiqueta) => etiqueta.tamanoFuente === tamanoFuente));
  }
});

test("carga una capa estática y propaga un fallo HTTP para aislarlo en la vista", async () => {
  const geojson = {
    type: "FeatureCollection",
    features: [
      {
        geometry: { type: "Point", coordinates: [-89.4, 16.4, 0] },
        properties: { STRING: "11.58", TEXT_ANGLE: 12, HEIGHT: 1 },
      },
    ],
  };
  const llamadas = [];
  const fetcher = async (url, options) => {
    llamadas.push({ url, options });
    return { ok: true, json: async () => geojson };
  };

  const etiquetas = await cargarCapaTexto("/geo/cotas_textos.geojson", {
    fetcher,
    signal: "senal-prueba",
  });

  assert.equal(etiquetas.length, 1);
  assert.deepEqual(llamadas, [
    {
      url: "/geo/cotas_textos.geojson",
      options: { signal: "senal-prueba" },
    },
  ]);

  await assert.rejects(
    cargarCapaTexto("/geo/faltante.geojson", {
      fetcher: async () => ({ ok: false }),
    }),
    /No se pudo cargar la capa/,
  );
});
