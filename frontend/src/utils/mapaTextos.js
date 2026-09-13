export const CAPAS_TEXTO_MAPA = Object.freeze({
  lotes: Object.freeze({
    etiqueta: "Números y áreas",
    url: "/geo/lotes_textos.geojson",
    visibleInicial: true,
  }),
  colindancias: Object.freeze({
    etiqueta: "Colindancias",
    url: "/geo/colindancias_textos.geojson",
    visibleInicial: true,
  }),
  cotas: Object.freeze({
    etiqueta: "Medidas",
    url: "/geo/cotas_textos.geojson",
    visibleInicial: false,
  }),
});

function numeroFinito(valor) {
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : null;
}

export function prepararEtiquetaCartografica(feature) {
  const coordinates = feature?.geometry?.coordinates;
  const properties = feature?.properties;

  if (
    feature?.geometry?.type !== "Point" ||
    !Array.isArray(coordinates) ||
    coordinates.length < 2 ||
    typeof properties?.STRING !== "string" ||
    properties.STRING.trim() === ""
  ) {
    throw new Error("Etiqueta cartográfica inválida");
  }

  const longitud = numeroFinito(coordinates[0]);
  const latitud = numeroFinito(coordinates[1]);
  const angulo = numeroFinito(properties.TEXT_ANGLE);
  const altura = numeroFinito(properties.HEIGHT);

  if (
    longitud === null ||
    latitud === null ||
    angulo === null ||
    altura === null ||
    altura <= 0
  ) {
    throw new Error("Propiedades cartográficas inválidas");
  }

  return {
    posicion: [latitud, longitud],
    texto: properties.STRING.replaceAll("\\n", "\n"),
    angulo,
    rotacionCss: -angulo,
    altura,
    tamanoFuente: Math.min(18, Math.max(10, 8 + altura * 4)),
  };
}

export function prepararCapaTexto(geojson) {
  if (geojson?.type !== "FeatureCollection" || !Array.isArray(geojson.features)) {
    throw new Error("La capa no es una colección GeoJSON válida");
  }

  return geojson.features.map(prepararEtiquetaCartografica);
}

export async function cargarCapaTexto(url, { fetcher = fetch, signal } = {}) {
  const response = await fetcher(url, { signal });
  if (!response.ok) {
    throw new Error(`No se pudo cargar la capa ${url}`);
  }

  return prepararCapaTexto(await response.json());
}
