import { useCallback, useEffect, useMemo, useState } from "react";
import L from "leaflet";
import {
  GeoJSON,
  MapContainer,
  Marker,
  TileLayer,
  useMap,
} from "react-leaflet";
import {
  AlertTriangle,
  LoaderCircle,
  MapPinned,
  RefreshCw,
} from "lucide-react";
import { authFetch, ROUTES } from "../services/api";
import {
  ESTADOS_MAPA,
  crearDetalleLote,
  obtenerEstadoMapa,
} from "../utils/mapaLotes";
import {
  CAPAS_TEXTO_MAPA,
  cargarCapaTexto,
} from "../utils/mapaTextos";

const CENTRO_GUATEMALA = [15.78, -90.23];
const ORDEN_ESTADOS = ["disponible", "vendido", "pagado", "mora", "conflicto"];
const ESTADO_DESCONOCIDO = { etiqueta: "Sin estado", color: "#64748b" };

function presentacionEstado(estado) {
  return obtenerEstadoMapa(estado) || ESTADO_DESCONOCIDO;
}

function crearEstadoInicialCapasTexto() {
  return Object.fromEntries(
    Object.entries(CAPAS_TEXTO_MAPA).map(([id, capa]) => [
      id,
      {
        visible: capa.visibleInicial,
        cargando: true,
        error: false,
        etiquetas: [],
      },
    ]),
  );
}

const formatoMoneda = new Intl.NumberFormat("es-GT", {
  style: "currency",
  currency: "GTQ",
  minimumFractionDigits: 2,
});

const formatoArea = new Intl.NumberFormat("es-GT", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

function mostrarMoneda(valor) {
  if (valor === null || valor === undefined || valor === "") return "—";
  const numero = Number(valor);
  return Number.isFinite(numero) ? formatoMoneda.format(numero) : "—";
}

function mostrarArea(valor) {
  if (valor === null || valor === undefined || valor === "") return "—";
  const numero = Number(valor);
  return Number.isFinite(numero) ? `${formatoArea.format(numero)} m²` : "—";
}

function AjustarVista({ coleccion }) {
  const map = useMap();

  useEffect(() => {
    if (!coleccion?.features?.length) return;

    const bounds = L.geoJSON(coleccion).getBounds();
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [24, 24], maxZoom: 19 });
    }
  }, [coleccion, map]);

  useEffect(() => {
    const container = map.getContainer();
    if (typeof ResizeObserver === "undefined") return undefined;

    const observer = new ResizeObserver(() =>
      map.invalidateSize({ pan: false }),
    );
    observer.observe(container);
    return () => observer.disconnect();
  }, [map]);

  return null;
}

function EtiquetaCartografica({ etiqueta, tipo }) {
  const icono = useMemo(() => {
    const contenido = document.createElement("span");
    contenido.className = `mapa-texto mapa-texto--${tipo}`;
    contenido.textContent = etiqueta.texto;
    contenido.setAttribute("aria-hidden", "true");
    contenido.style.setProperty(
      "--mapa-texto-angulo",
      `${etiqueta.rotacionCss}deg`,
    );
    contenido.style.setProperty(
      "--mapa-texto-tamano",
      `${etiqueta.tamanoFuente}px`,
    );

    return L.divIcon({
      html: contenido,
      className: `mapa-texto-wrapper mapa-texto-wrapper--${tipo}`,
      iconSize: [0, 0],
      iconAnchor: [0, 0],
    });
  }, [etiqueta, tipo]);

  return (
    <Marker
      position={etiqueta.posicion}
      icon={icono}
      interactive={false}
      keyboard={false}
      bubblingMouseEvents={false}
    />
  );
}

function FilaDetalle({ etiqueta, valor, destacado = false }) {
  return (
    <div className="flex min-w-0 items-start justify-between gap-3 border-b border-[var(--card-border)] py-2.5 last:border-b-0">
      <dt className="shrink-0 text-sm text-[var(--text-muted)]">{etiqueta}</dt>
      <dd
        className={`min-w-0 break-words text-right text-sm ${destacado ? "font-bold" : "font-semibold"}`}
      >
        {valor}
      </dd>
    </div>
  );
}

export default function MapaLotes() {
  const [coleccion, setColeccion] = useState({
    type: "FeatureCollection",
    features: [],
  });
  const [seleccion, setSeleccion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [capasTexto, setCapasTexto] = useState(crearEstadoInicialCapasTexto);

  const cargarLotes = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await authFetch(ROUTES.MAPA_LOTES);
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "No se pudo cargar el mapa de lotes");
      }
      if (data.type !== "FeatureCollection" || !Array.isArray(data.features)) {
        throw new Error("El servidor devolvió un mapa con formato inválido");
      }

      setColeccion(data);
      setSeleccion((actual) => {
        if (!actual) return null;
        return (
          data.features.find(
            (feature) =>
              feature.properties?.loteId === actual.properties?.loteId,
          ) || null
        );
      });
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo cargar el mapa de lotes",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarLotes();
  }, [cargarLotes]);

  useEffect(() => {
    const controller = new AbortController();

    for (const [id, capa] of Object.entries(CAPAS_TEXTO_MAPA)) {
      cargarCapaTexto(capa.url, { signal: controller.signal })
        .then((etiquetas) => {
          setCapasTexto((actual) => ({
            ...actual,
            [id]: {
              ...actual[id],
              cargando: false,
              error: false,
              etiquetas,
            },
          }));
        })
        .catch((err) => {
          if (controller.signal.aborted) return;

          console.warn(`No se pudo cargar ${capa.etiqueta}`, err);
          setCapasTexto((actual) => ({
            ...actual,
            [id]: {
              ...actual[id],
              visible: false,
              cargando: false,
              error: true,
              etiquetas: [],
            },
          }));
        });
    }

    return () => controller.abort();
  }, []);

  const detalle = useMemo(
    () => (seleccion ? crearDetalleLote(seleccion) : null),
    [seleccion],
  );

  return (
    <div className="min-w-0 text-[var(--text)]">
      <div className="mb-4 flex min-w-0 flex-col gap-3 sm:mb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2.5">
            <MapPinned className="shrink-0 text-[var(--primary)]" size={26} />
            <h1 className="break-words text-xl font-bold sm:text-2xl">
              Mapa de Lotes
            </h1>
          </div>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Consulta geográfica y estado actual de los lotes.
          </p>
        </div>

        <button
          type="button"
          onClick={cargarLotes}
          disabled={loading}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-3 py-2 text-sm font-semibold shadow-sm hover:opacity-80 disabled:cursor-wait disabled:opacity-60 sm:w-auto"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Actualizar
        </button>
      </div>

      <section
        aria-label="Leyenda del mapa"
        className="mb-4 flex min-w-0 flex-wrap gap-x-4 gap-y-2 rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-3 py-3 shadow-sm sm:px-4"
      >
        {ORDEN_ESTADOS.map((estado) => {
          const presentacion = ESTADOS_MAPA[estado];
          return (
            <div
              key={estado}
              className="flex items-center gap-2 text-xs font-medium sm:text-sm"
            >
              <span
                className="h-3.5 w-3.5 shrink-0 rounded-sm border border-black/15"
                style={{ backgroundColor: presentacion.color }}
              />
              {presentacion.etiqueta}
            </div>
          );
        })}
      </section>

      <fieldset className="mb-4 min-w-0 rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-3 py-3 shadow-sm sm:px-4">
        <legend className="px-1 text-sm font-bold">Capas de texto</legend>
        <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3">
          {Object.entries(CAPAS_TEXTO_MAPA).map(([id, capa]) => {
            const estado = capasTexto[id];
            return (
              <label
                key={id}
                className={`flex min-w-0 items-start gap-2 rounded-lg border border-[var(--card-border)] px-3 py-2 text-sm ${estado.error ? "cursor-not-allowed opacity-70" : "cursor-pointer"}`}
              >
                <input
                  type="checkbox"
                  checked={estado.visible}
                  disabled={estado.error}
                  onChange={(event) => {
                    const visible = event.target.checked;
                    setCapasTexto((actual) => ({
                      ...actual,
                      [id]: { ...actual[id], visible },
                    }));
                  }}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-emerald-600"
                />
                <span className="min-w-0 break-words font-medium">
                  {capa.etiqueta}
                  {estado.cargando && (
                    <span className="ml-1 text-xs font-normal text-[var(--text-muted)]">
                      Cargando...
                    </span>
                  )}
                  {estado.error && (
                    <span className="ml-1 text-xs font-normal text-red-600 dark:text-red-300">
                      No disponible
                    </span>
                  )}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {error && (
        <div
          role="alert"
          className="mb-4 flex items-start gap-2 rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-200"
        >
          <AlertTriangle className="mt-0.5 shrink-0" size={18} />
          <span className="min-w-0 break-words">{error}</span>
        </div>
      )}

      <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section
          aria-label="Mapa interactivo de lotes"
          className="relative min-w-0 overflow-hidden rounded-xl border border-[var(--card-border)] bg-[var(--card)] shadow-sm"
        >
          <div className="h-[52dvh] min-h-[340px] w-full sm:h-[62dvh] sm:min-h-[440px] xl:h-[calc(100dvh-13.5rem)] xl:min-h-[520px] xl:max-h-[760px]">
            <MapContainer
              center={CENTRO_GUATEMALA}
              zoom={7}
              minZoom={5}
              maxZoom={19}
              scrollWheelZoom
              className="mapa-lotes-map h-full w-full"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                maxZoom={19}
              />
              <AjustarVista coleccion={coleccion} />

              {coleccion.features.map((feature) => {
                const properties = feature.properties || {};
                const presentacion = presentacionEstado(properties.estadoMapa);
                const seleccionada =
                  properties.loteId === seleccion?.properties?.loteId;

                return (
                  <GeoJSON
                    key={`${properties.loteId}-${properties.codigo}`}
                    data={feature}
                    style={{
                      color: presentacion.color,
                      fillColor: presentacion.color,
                      fillOpacity: seleccionada ? 0.62 : 0.42,
                      weight: seleccionada ? 4 : 2.5,
                      dashArray:
                        properties.estadoMapa === "conflicto"
                          ? "8 6"
                          : undefined,
                    }}
                    eventHandlers={{ click: () => setSeleccion(feature) }}
                  />
                );
              })}

              {Object.entries(CAPAS_TEXTO_MAPA).map(([tipo]) =>
                capasTexto[tipo].visible
                  ? capasTexto[tipo].etiquetas.map((etiqueta, index) => (
                      <EtiquetaCartografica
                        key={`${tipo}-${index}`}
                        etiqueta={etiqueta}
                        tipo={tipo}
                      />
                    ))
                  : null,
              )}
            </MapContainer>
          </div>

          {loading && (
            <div className="absolute inset-0 z-[500] flex items-center justify-center bg-white/75 backdrop-blur-[1px] dark:bg-slate-950/70">
              <div className="flex items-center gap-2 rounded-lg bg-[var(--card)] px-4 py-3 text-sm font-semibold shadow-lg">
                <LoaderCircle
                  className="animate-spin text-[var(--primary)]"
                  size={20}
                />
                Cargando lotes...
              </div>
            </div>
          )}

          {!loading && !error && coleccion.features.length === 0 && (
            <div className="absolute inset-x-3 top-3 z-[500] rounded-lg border border-[var(--card-border)] bg-[var(--card)]/95 p-3 text-center text-sm shadow-md">
              Aún no hay geometrías de lotes disponibles.
            </div>
          )}
        </section>

        <aside className="min-w-0 rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4 shadow-sm xl:self-start">
          <h2 className="text-base font-bold sm:text-lg">Detalle del lote</h2>

          {!detalle ? (
            <div className="flex min-h-36 flex-col items-center justify-center py-6 text-center text-sm text-[var(--text-muted)]">
              <MapPinned className="mb-2 opacity-50" size={30} />
              Selecciona un lote en el mapa para consultar su información.
            </div>
          ) : (
            <div className="mt-3 min-w-0">
              <div className="mb-3 flex min-w-0 flex-wrap items-center justify-between gap-2">
                <p className="break-words text-lg font-bold">
                  {detalle.etiqueta}
                </p>
                <span
                  className="rounded-full px-2.5 py-1 text-xs font-bold text-white"
                  style={{
                    backgroundColor: presentacionEstado(detalle.estadoMapa)
                      .color,
                  }}
                >
                  {presentacionEstado(detalle.estadoMapa).etiqueta}
                </span>
              </div>

              {detalle.conflictoIntegridad && (
                <div className="mb-3 rounded-lg border border-orange-300 bg-orange-50 p-3 text-sm text-orange-900 dark:border-orange-900/70 dark:bg-orange-950/40 dark:text-orange-100">
                  <p className="font-bold">Conflicto de integridad</p>
                  <p className="mt-1">
                    Ventas activas asociadas: {detalle.cantidadVentasActivas}
                  </p>
                </div>
              )}

              <dl className="min-w-0">
                <FilaDetalle etiqueta="Número" valor={detalle.numero || "—"} />
                <FilaDetalle
                  etiqueta="Área"
                  valor={mostrarArea(detalle.area)}
                />
                <FilaDetalle
                  etiqueta="Cliente"
                  valor={
                    detalle.cliente
                      ? `${detalle.cliente.nombres} ${detalle.cliente.apellidos}`
                      : "—"
                  }
                />
                <FilaDetalle
                  etiqueta="Cuotas"
                  valor={detalle.fraccion ?? "—"}
                />
                <FilaDetalle
                  etiqueta="Saldo"
                  valor={mostrarMoneda(detalle.saldoPendiente)}
                  destacado
                />
                <FilaDetalle
                  etiqueta="Mora"
                  valor={
                    detalle.enMora == null
                      ? "—"
                      : detalle.enMora
                        ? `Sí · ${detalle.diasAtraso ?? 0} día(s)`
                        : "No"
                  }
                />
              </dl>

              {detalle.mostrarVender && (
                <button
                  type="button"
                  disabled
                  title="La creación de ventas desde el mapa estará disponible próximamente"
                  className="mt-4 w-full cursor-not-allowed rounded-lg bg-[var(--primary)] px-4 py-2.5 font-bold text-white opacity-70"
                >
                  Vender
                </button>
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
