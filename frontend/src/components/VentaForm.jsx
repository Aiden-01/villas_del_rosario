import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Toast from "./Toast";
import useToast from "../hooks/useToast";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  LoaderCircle,
  MapPinned,
  Pencil,
  Plus,
  Search,
  Trash2,
  User,
} from "lucide-react";
import { API_URL, authFetch, ROUTES } from "../services/api";
import {
  errorInvalidaPreseleccionLoteMapa,
  limpiarPreseleccionLoteMapa,
  parsearLoteIdMapa,
  resolverLoteVentaDesdeMapa,
} from "../utils/mapaLotes";
import {
  cambiarModoPredio,
  lotesVisiblesParaPredio,
  normalizarCatalogoLotes,
  resolverPrediosSeleccionados,
  seleccionarLoteExistente,
} from "../utils/lotesVenta";

const FRECUENCIAS = ["mensual"];
const predioVacio = () => ({
  numeroLote: "",
  medidaLote: "",
  areaLote: "",
  precio: "",
  busquedaLote: "",
  modoManual: false,
});

function aplicarPrediosFormulario(formData, predios) {
  const principal = predios[0] || predioVacio();

  return {
    ...formData,
    loteId: principal.loteId || undefined,
    numeroLote: principal.numeroLote,
    medidaLote: principal.medidaLote,
    areaLote: principal.areaLote,
    predios,
  };
}

function aplicarLoteMapa(formData, lote) {
  const predios = formData.predios.length > 0 ? [...formData.predios] : [predioVacio()];
  predios[0] = { ...predios[0], ...lote };

  return {
    ...formData,
    loteId: lote.loteId,
    numeroLote: lote.numeroLote,
    medidaLote: lote.medidaLote,
    areaLote: lote.areaLote,
    predios,
  };
}

function SelectorLotePredio({
  catalogo,
  cargando,
  index,
  inputStyle,
  onBuscar,
  onModoManual,
  onSeleccionar,
  predio,
  predios,
}) {
  const opciones = lotesVisiblesParaPredio(
    catalogo,
    predios,
    index,
    predio.busquedaLote || "",
  );
  const seleccionado = catalogo.find(
    (lote) => lote.loteId === parsearLoteIdMapa(predio.loteId),
  );

  return (
    <div className="space-y-2">
      <label className="block text-xs font-semibold opacity-75" htmlFor={`buscar-lote-${index}`}>
        Buscar lote existente
      </label>
      <div className="relative">
        <Search
          size={14}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 opacity-50"
        />
        <input
          id={`buscar-lote-${index}`}
          type="search"
          value={predio.busquedaLote || ""}
          onChange={(event) => onBuscar(index, "busquedaLote", event.target.value)}
          placeholder="Buscar por número de lote..."
          className="w-full rounded-lg py-2 pl-8 pr-3 text-sm"
          style={inputStyle}
          disabled={cargando}
        />
      </div>
      <select
        aria-label={`Seleccionar lote del predio ${index + 1}`}
        value={predio.loteId || ""}
        onChange={(event) => onSeleccionar(index, event.target.value)}
        className="w-full rounded-lg p-2 text-sm"
        style={inputStyle}
        disabled={cargando}
      >
        <option value="">Selecciona un lote disponible</option>
        {opciones.map((lote) => (
          <option key={lote.loteId} value={lote.loteId} disabled={!lote.disponible}>
            Lote {lote.numeroLote} · Área {lote.areaLote || "sin dato"} ·{" "}
            {lote.estadoDisponibilidad}
          </option>
        ))}
      </select>

      {!cargando && opciones.length === 0 && (
        <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-200">
          No hay lotes que coincidan con la búsqueda.
        </p>
      )}

      {seleccionado && (
        <div
          className={`grid gap-2 rounded-lg border px-3 py-2 text-xs sm:grid-cols-3 ${
            seleccionado.disponible
              ? "border-emerald-300 bg-emerald-50 dark:border-emerald-900/70 dark:bg-emerald-950/40"
              : "border-red-300 bg-red-50 dark:border-red-900/70 dark:bg-red-950/40"
          }`}
        >
          <span>
            <strong>Número:</strong> {seleccionado.numeroLote}
          </span>
          <span>
            <strong>Área:</strong> {seleccionado.areaLote || "Sin dato"}
          </span>
          <span>
            <strong>Medida:</strong> {seleccionado.medidaLote || "Sin dato"}
          </span>
          {!seleccionado.disponible && (
            <span className="font-semibold text-red-700 dark:text-red-300 sm:col-span-3">
              Este lote ya no está disponible.
            </span>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={() => onModoManual(index, true)}
        className="text-left text-xs font-semibold underline-offset-2 hover:underline"
        style={{ color: "var(--secondary)" }}
      >
        El lote todavía no está registrado
      </button>
    </div>
  );
}

async function validarRespuesta(response, mensajePredeterminado) {
  if (response.ok) return;

  const data = await response.json().catch(() => ({}));
  const error = new Error(data.message || mensajePredeterminado);
  error.status = response.status;
  error.data = data;
  throw error;
}

export default function VentaForm({ mode, ventaId }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const clienteIdFromUrl = searchParams.get("clienteId");
  const loteIdFromUrl = searchParams.get("loteId");
  const isEdit = mode === "edit";
  const desdeMapa = !isEdit && loteIdFromUrl !== null;
  const esCreacionManual = !isEdit && !desdeMapa;
  const { toast, showToast, closeToast } = useToast();

  const [formData, setFormData] = useState({
    clienteId: clienteIdFromUrl || "",
    monto: "",
    cuotas: "",
    fechaInicio: "",
    fechaFin: "",
    frecuenciaPago: "mensual",
    numeroLote: "",
    medidaLote: "",
    areaLote: "",
    predios: [predioVacio()],
    fechaCobro: "",
    enganche: "",
    interes: 0,
  });

  const [clientes, setClientes] = useState([]);
  const [clientesFiltrados, setClientesFiltrados] = useState([]);
  const [busquedaCliente, setBusquedaCliente] = useState("");
  const [clientePreseleccionado, setClientePreseleccionado] = useState(null);
  const [selectorAbierto, setSelectorAbierto] = useState(false);
  const [lotePreseleccionado, setLotePreseleccionado] = useState(null);
  const [cargandoLoteMapa, setCargandoLoteMapa] = useState(desdeMapa);
  const [errorLoteMapa, setErrorLoteMapa] = useState("");
  const [guardandoVenta, setGuardandoVenta] = useState(false);
  const [lotesComerciales, setLotesComerciales] = useState([]);
  const [cargandoLotes, setCargandoLotes] = useState(esCreacionManual);
  const [errorLotes, setErrorLotes] = useState("");
  const guardandoVentaRef = useRef(false);

  useEffect(() => {
    if (formData.fechaInicio && formData.cuotas) {
      const inicio = new Date(formData.fechaInicio);
      inicio.setMonth(inicio.getMonth() + Number(formData.cuotas));
      const fechaFin = inicio.toISOString().split("T")[0];
      setFormData((prev) => ({ ...prev, fechaFin }));
    }
  }, [formData.fechaInicio, formData.cuotas]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!busquedaCliente.trim()) {
        setClientesFiltrados(clientes);
        return;
      }
      const term = busquedaCliente.toLowerCase();
      setClientesFiltrados(
        clientes.filter((cliente) => {
          const fullName = `${cliente.nombres} ${cliente.apellidos}`.toLowerCase();
          return (
            fullName.includes(term) ||
            (cliente.telefono || "").toLowerCase().includes(term) ||
            (cliente.direccion || "").toLowerCase().includes(term)
          );
        })
      );
    }, 250);
    return () => clearTimeout(timeout);
  }, [busquedaCliente, clientes]);

  const obtenerClientes = useCallback(async () => {
    try {
      const res = await authFetch(`${API_URL}/api/clientes`);
      const data = await res.json();
      setClientes(data);
      setClientesFiltrados(data);
      if (clienteIdFromUrl) {
        const encontrado = data.find((cliente) => cliente.id === parseInt(clienteIdFromUrl));
        if (encontrado) setClientePreseleccionado(encontrado);
      }
    } catch (error) {
      console.error("Error cargando clientes:", error);
    }
  }, [clienteIdFromUrl]);

  const obtenerVenta = useCallback(async () => {
    try {
      const res = await authFetch(`${API_URL}/api/ventas/${ventaId}`);
      const venta = await res.json();
      const predios =
        venta.predios?.length > 0
          ? venta.predios.map((predio) => ({
              numeroLote: predio.numeroLote || "",
              medidaLote: predio.medidaLote || "",
              areaLote: predio.areaLote || "",
              precio: predio.precio || "",
            }))
          : [
              {
                numeroLote: venta.numeroLote || "",
                medidaLote: venta.medidaLote || "",
                areaLote: venta.areaLote || "",
                precio: "",
              },
            ];
      setFormData({
        clienteId: venta.clienteId || "",
        monto: venta.monto || "",
        cuotas: venta.cuotas || "",
        fechaInicio: venta.fechaInicio?.split("T")[0] || "",
        fechaFin: venta.fechaFin?.split("T")[0] || "",
        frecuenciaPago: venta.frecuenciaPago || "mensual",
        numeroLote: venta.numeroLote || "",
        medidaLote: venta.medidaLote || "",
        areaLote: venta.areaLote || "",
        predios,
        fechaCobro: venta.fechaCobro?.split("T")[0] || "",
        enganche: "",
        interes: 0,
      });
    } catch (error) {
      console.error("Error cargando venta:", error);
    }
  }, [ventaId]);

  const obtenerLoteDesdeMapa = useCallback(async () => {
    if (!parsearLoteIdMapa(loteIdFromUrl)) {
      throw new Error("El identificador del lote seleccionado no es válido.");
    }

    const response = await authFetch(ROUTES.MAPA_LOTES);
    await validarRespuesta(response, "No se pudo verificar el lote seleccionado");
    const coleccion = await response.json();

    if (coleccion?.type !== "FeatureCollection" || !Array.isArray(coleccion.features)) {
      throw new Error("El servidor devolvió un mapa con formato inválido.");
    }

    const resultado = resolverLoteVentaDesdeMapa(coleccion, loteIdFromUrl);
    if (!resultado.lote) throw new Error(resultado.error);
    return resultado.lote;
  }, [loteIdFromUrl]);

  const obtenerLotesComerciales = useCallback(async () => {
    try {
      const response = await authFetch(ROUTES.LOTES);
      await validarRespuesta(response, "No se pudo cargar el catálogo de lotes");
      const data = await response.json();
      if (!Array.isArray(data?.lotes)) {
        throw new Error("El servidor devolvió un catálogo de lotes inválido.");
      }
      return normalizarCatalogoLotes(data);
    } catch (error) {
      error.esErrorLotes = true;
      throw error;
    }
  }, []);

  const cargarLotesComerciales = useCallback(async () => {
    setCargandoLotes(true);
    setErrorLotes("");
    try {
      const catalogo = await obtenerLotesComerciales();
      setLotesComerciales(catalogo);
      return catalogo;
    } catch (error) {
      setLotesComerciales([]);
      setErrorLotes(error?.message || "No se pudo cargar el catálogo de lotes.");
      throw error;
    } finally {
      setCargandoLotes(false);
    }
  }, [obtenerLotesComerciales]);

  useEffect(() => {
    obtenerClientes();
    if (isEdit && ventaId) obtenerVenta();
  }, [isEdit, obtenerClientes, obtenerVenta, ventaId]);

  useEffect(() => {
    if (!esCreacionManual) {
      setCargandoLotes(false);
      return undefined;
    }

    let activo = true;
    setCargandoLotes(true);
    setErrorLotes("");
    obtenerLotesComerciales()
      .then((catalogo) => {
        if (activo) setLotesComerciales(catalogo);
      })
      .catch((error) => {
        if (!activo) return;
        setLotesComerciales([]);
        setErrorLotes(error?.message || "No se pudo cargar el catálogo de lotes.");
      })
      .finally(() => {
        if (activo) setCargandoLotes(false);
      });

    return () => {
      activo = false;
    };
  }, [esCreacionManual, obtenerLotesComerciales]);

  useEffect(() => {
    setLotePreseleccionado(null);
    setErrorLoteMapa("");
    setFormData((prev) => limpiarPreseleccionLoteMapa(prev));

    if (!desdeMapa) {
      setCargandoLoteMapa(false);
      return undefined;
    }

    let activo = true;
    setCargandoLoteMapa(true);

    obtenerLoteDesdeMapa()
      .then((lote) => {
        if (!activo) return;
        setLotePreseleccionado(lote);
        setFormData((prev) => aplicarLoteMapa(prev, lote));
      })
      .catch((error) => {
        if (!activo) return;
        setLotePreseleccionado(null);
        setErrorLoteMapa(error?.message || "No se pudo verificar el lote seleccionado.");
      })
      .finally(() => {
        if (activo) setCargandoLoteMapa(false);
      });

    return () => {
      activo = false;
    };
  }, [desdeMapa, obtenerLoteDesdeMapa]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isEdit) {
      const predios = formData.predios
        .map((predio) => ({
          numeroLote: predio.numeroLote.trim(),
          medidaLote: predio.medidaLote.trim() || undefined,
          areaLote: predio.areaLote.trim() || undefined,
          precio: predio.precio === "" ? undefined : Number(predio.precio),
        }))
        .filter((predio) => predio.numeroLote);

      if (predios.length === 0) {
        showToast("Agrega al menos un predio a la venta", "error");
        return;
      }

      const payload = {
        ...formData,
        numeroLote: predios[0].numeroLote,
        medidaLote: predios[0].medidaLote,
        areaLote: predios[0].areaLote,
        predios,
      };

      try {
        const res = await authFetch(`${API_URL}/api/ventas/${ventaId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error((await res.json()).message);
        showToast("Venta actualizada correctamente", "success");
        setTimeout(() => navigate("/ventas"), 1500);
      } catch (error) {
        console.error(error);
        const mensaje = error?.message || "Error al guardar la venta";
        showToast(mensaje, "error");
      }
      return;
    }

    if (guardandoVentaRef.current) return;
    guardandoVentaRef.current = true;
    setGuardandoVenta(true);
    let guardadoExitosamente = false;

    try {
      let datosEnvio;
      if (desdeMapa) {
        setCargandoLoteMapa(true);
        const loteActual = await obtenerLoteDesdeMapa();
        datosEnvio = aplicarLoteMapa(formData, loteActual);
        setLotePreseleccionado(loteActual);
        setErrorLoteMapa("");
        setCargandoLoteMapa(false);
      } else {
        setCargandoLotes(true);
        const catalogoActual = await obtenerLotesComerciales();
        setLotesComerciales(catalogoActual);
        const validacion = resolverPrediosSeleccionados(catalogoActual, formData.predios);
        if (!validacion.predios) {
          const error = new Error(validacion.error);
          error.status = 409;
          error.data = { loteId: validacion.loteId };
          error.esErrorLotes = true;
          throw error;
        }
        datosEnvio = aplicarPrediosFormulario(formData, validacion.predios);
        setErrorLotes("");
        setCargandoLotes(false);
      }
      setFormData(datosEnvio);

      const predios = datosEnvio.predios
        .map((predio) => ({
          ...(predio.loteId ? { loteId: Number(predio.loteId) } : {}),
          numeroLote: predio.numeroLote.trim(),
          medidaLote: predio.medidaLote.trim() || undefined,
          areaLote: predio.areaLote.trim() || undefined,
          precio: predio.precio === "" ? undefined : Number(predio.precio),
        }))
        .filter((predio) => predio.numeroLote);

      if (predios.length === 0) {
        showToast("Agrega al menos un predio a la venta", "error");
        return;
      }

      const payload = {
        ...datosEnvio,
        loteId: predios[0].loteId,
        numeroLote: predios[0].numeroLote,
        medidaLote: predios[0].medidaLote,
        areaLote: predios[0].areaLote,
        predios,
      };
      const res = await authFetch(`${API_URL}/api/ventas`, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const error = new Error(data.message || "Error al crear la venta");
        error.status = res.status;
        error.data = data;
        error.esErrorLotes = Boolean(data.loteId && [400, 404, 409].includes(res.status));
        throw error;
      }

      showToast("Venta creada correctamente", "success");
      guardadoExitosamente = true;
      setTimeout(() => navigate("/ventas"), 1500);
    } catch (error) {
      console.error(error);
      const mensaje = error?.message || "Error al guardar la venta";
      if (desdeMapa && errorInvalidaPreseleccionLoteMapa(error, formData.loteId)) {
        setLotePreseleccionado(null);
        setErrorLoteMapa(mensaje);
      }
      if (esCreacionManual && error?.esErrorLotes) {
        setErrorLotes(mensaje);
        if ([400, 404, 409].includes(Number(error?.status))) {
          try {
            setLotesComerciales(await obtenerLotesComerciales());
          } catch {
            // Se conserva el mensaje original del rechazo de la venta.
          }
        }
      }
      showToast(mensaje, "error");
    } finally {
      setCargandoLoteMapa(false);
      setCargandoLotes(false);
      if (!guardadoExitosamente) {
        guardandoVentaRef.current = false;
        setGuardandoVenta(false);
      }
    }
  };

  const inputStyle = {
    backgroundColor: "var(--bg)",
    color: "var(--text)",
    border: "1px solid var(--card-border)",
  };

  const selectedCliente = useMemo(
    () => clientes.find((cliente) => String(cliente.id) === String(formData.clienteId)),
    [clientes, formData.clienteId]
  );

  const seleccionarCliente = (cliente) => {
    setFormData((prev) => ({ ...prev, clienteId: String(cliente.id) }));
    setBusquedaCliente(`${cliente.nombres} ${cliente.apellidos}`);
    setSelectorAbierto(false);
  };

  const cambiarCliente = () => {
    setBusquedaCliente("");
    setSelectorAbierto(true);
  };

  const actualizarPredio = (index, campo, valor) => {
    setFormData((prev) => {
      const predios = prev.predios.map((predio, predioIndex) =>
        predioIndex === index ? { ...predio, [campo]: valor } : predio
      );
      const principal = predios[0] || predioVacio();

      return {
        ...prev,
        predios,
        loteId: principal.loteId || undefined,
        numeroLote: principal.numeroLote,
        medidaLote: principal.medidaLote,
        areaLote: principal.areaLote,
      };
    });
  };

  const agregarPredio = () => {
    setFormData((prev) => ({ ...prev, predios: [...prev.predios, predioVacio()] }));
  };

  const seleccionarLote = (index, loteId) => {
    if (!parsearLoteIdMapa(loteId)) {
      const predios = cambiarModoPredio(formData.predios, index, false);
      setFormData((prev) => aplicarPrediosFormulario(prev, predios));
      setErrorLotes("");
      return;
    }

    const predios = seleccionarLoteExistente(
      lotesComerciales,
      formData.predios,
      index,
      loteId,
    );
    if (!predios) {
      showToast("Ese lote no está disponible o ya fue seleccionado", "error");
      return;
    }

    setFormData((prev) => aplicarPrediosFormulario(prev, predios));
    setErrorLotes("");
  };

  const cambiarModoLote = (index, modoManual) => {
    const predios = cambiarModoPredio(formData.predios, index, modoManual);
    setFormData((prev) => aplicarPrediosFormulario(prev, predios));
    setErrorLotes("");
  };

  const quitarPredio = (index) => {
    setFormData((prev) => {
      const predios = prev.predios.filter((_, predioIndex) => predioIndex !== index);
      const normalizados = predios.length > 0 ? predios : [predioVacio()];
      const principal = normalizados[0];

      return {
        ...prev,
        predios: normalizados,
        loteId: principal.loteId || undefined,
        numeroLote: principal.numeroLote,
        medidaLote: principal.medidaLote,
        areaLote: principal.areaLote,
      };
    });
  };

  const precio = Number(formData.monto || 0);
  const enganche = Number(formData.enganche || 0);
  const cuotas = Number(formData.cuotas || 0);
  const saldoDespuesEnganche = Math.max(precio - enganche, 0);
  const cuotaMensual = cuotas > 0 ? saldoDespuesEnganche / cuotas : 0;
  const requiereCatalogoLotes =
    esCreacionManual && formData.predios.some((predio) => !predio.modoManual);
  const selectorLoteIncompleto =
    requiereCatalogoLotes &&
    formData.predios.some(
      (predio) => !predio.modoManual && !parsearLoteIdMapa(predio.loteId),
    );
  const formularioBloqueadoPorLote =
    guardandoVenta ||
    (desdeMapa && (cargandoLoteMapa || Boolean(errorLoteMapa) || !lotePreseleccionado)) ||
    (requiereCatalogoLotes &&
      (cargandoLotes || Boolean(errorLotes) || selectorLoteIncompleto));
  const esPredioPreseleccionado = (predio, index) =>
    Boolean(
      lotePreseleccionado &&
        index === 0 &&
        Number(predio.loteId) === lotePreseleccionado.loteId,
    );

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className="bg-[var(--card)] p-4 sm:p-6 rounded-xl shadow-lg w-full max-w-md space-y-4"
      >
        {desdeMapa && (
          <div
            role={errorLoteMapa ? "alert" : "status"}
            aria-live="polite"
            className={`flex min-w-0 items-start gap-3 rounded-xl border p-3 text-sm ${
              errorLoteMapa
                ? "border-red-300 bg-red-50 text-red-800 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-200"
                : "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-100"
            }`}
          >
            {cargandoLoteMapa ? (
              <LoaderCircle className="mt-0.5 shrink-0 animate-spin" size={19} />
            ) : errorLoteMapa ? (
              <AlertTriangle className="mt-0.5 shrink-0" size={19} />
            ) : (
              <MapPinned className="mt-0.5 shrink-0" size={19} />
            )}
            <div className="min-w-0 break-words">
              <p className="font-bold">
                {cargandoLoteMapa
                  ? "Verificando lote seleccionado..."
                  : errorLoteMapa
                    ? "No se puede usar la preselección"
                    : `Lote ${lotePreseleccionado?.numeroLote || ""} preseleccionado desde el mapa`}
              </p>
              {!cargandoLoteMapa && (
                <p className="mt-1 text-xs">
                  {errorLoteMapa ||
                    "La disponibilidad se verificará nuevamente antes de crear la venta."}
                </p>
              )}
            </div>
          </div>
        )}
        {clientePreseleccionado && !isEdit ? (
          <div className="flex items-center gap-2 w-full p-2 rounded font-semibold" style={inputStyle}>
            <User size={15} className="opacity-60 shrink-0" />
            {clientePreseleccionado.nombres} {clientePreseleccionado.apellidos}
          </div>
        ) : (
          <div className="space-y-2">
            <label className="text-sm font-semibold block" style={{ color: "var(--text)" }}>
              Cliente
            </label>
            {selectedCliente && !selectorAbierto ? (
              <div
                className="flex items-center justify-between gap-3 rounded-xl px-3 py-3 text-sm transition-all duration-300 ease-out animate-[clienteSelected_0.28s_ease-out]"
                style={{ ...inputStyle, borderColor: "#22c55e", boxShadow: "0 10px 24px rgba(34,197,94,0.12)" }}
              >
                <div className="flex min-w-0 items-center gap-2">
                  <CheckCircle2 size={18} className="shrink-0 text-green-500" />
                  <div className="min-w-0">
                    <p className="truncate font-semibold">
                      {selectedCliente.nombres} {selectedCliente.apellidos}
                    </p>
                    <p className="truncate text-xs opacity-60">
                      {selectedCliente.telefono || "Sin telefono"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={cambiarCliente}
                  className="flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold transition hover:scale-105"
                  style={{ color: "var(--secondary)" }}
                >
                  <Pencil size={13} />
                  Cambiar
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar por nombre, telefono o direccion..."
                    value={busquedaCliente}
                    onChange={(e) => {
                      setBusquedaCliente(e.target.value);
                      setSelectorAbierto(true);
                    }}
                    onFocus={() => setSelectorAbierto(true)}
                    className="w-full pl-8 pr-3 py-2 rounded-lg text-sm focus:outline-none transition-all duration-200 focus:scale-[1.01]"
                    style={inputStyle}
                  />
                </div>
                <div
                  className="max-h-48 overflow-y-auto rounded-xl text-sm transition-all duration-300 ease-out animate-[clienteOptions_0.22s_ease-out]"
                  style={{ ...inputStyle, backgroundColor: "var(--card)" }}
                >
                  {clientesFiltrados.length === 0 ? (
                    <p className="px-3 py-3 text-xs opacity-60">No hay clientes con esa busqueda.</p>
                  ) : (
                    clientesFiltrados.slice(0, 8).map((cliente) => (
                      <button
                        key={cliente.id}
                        type="button"
                        onClick={() => seleccionarCliente(cliente)}
                        className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left transition hover:scale-[1.01]"
                        style={{ borderBottom: "1px solid var(--card-border)" }}
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-semibold">
                            {cliente.nombres} {cliente.apellidos}
                          </span>
                          <span className="block truncate text-xs opacity-60">
                            {cliente.telefono || "Sin telefono"}
                          </span>
                        </span>
                        {String(formData.clienteId) === String(cliente.id) && (
                          <CheckCircle2 size={16} className="shrink-0 text-green-500" />
                        )}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <label className="text-sm font-semibold" style={{ color: "var(--text)" }}>
              Predios de la venta
            </label>
            <button
              type="button"
              onClick={agregarPredio}
              className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition hover:scale-105"
              style={{ backgroundColor: "var(--secondary)" }}
            >
              <Plus size={14} />
              Agregar
            </button>
          </div>

          {esCreacionManual && cargandoLotes && (
            <p className="flex items-center gap-2 rounded-lg border border-[var(--card-border)] px-3 py-2 text-xs">
              <LoaderCircle size={15} className="animate-spin" />
              Cargando lotes comerciales...
            </p>
          )}
          {esCreacionManual && errorLotes && (
            <div
              role="alert"
              className="flex flex-col gap-2 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-200 sm:flex-row sm:items-center sm:justify-between"
            >
              <span className="min-w-0 break-words">{errorLotes}</span>
              <button
                type="button"
                onClick={() => void cargarLotesComerciales().catch(() => {})}
                className="shrink-0 rounded-md border border-current px-2 py-1 font-semibold"
              >
                Reintentar
              </button>
            </div>
          )}
          {esCreacionManual &&
            !cargandoLotes &&
            !errorLotes &&
            !lotesComerciales.some((lote) => lote.disponible) && (
              <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-200">
                No hay lotes disponibles. Puedes usar el modo de lote no registrado únicamente si
                corresponde a un alta legítima.
              </p>
            )}

          {formData.predios.map((predio, index) => (
            <div
              key={index}
              className="space-y-2 rounded-xl p-3 transition-all duration-300 animate-[clienteOptions_0.22s_ease-out]"
              style={{ backgroundColor: "var(--bg)", border: "1px solid var(--card-border)" }}
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold opacity-70">Predio {index + 1}</p>
                {formData.predios.length > 1 &&
                  !esPredioPreseleccionado(predio, index) && (
                  <button
                    type="button"
                    onClick={() => quitarPredio(index)}
                    className="grid h-8 w-8 place-items-center rounded-lg text-red-500 transition hover:scale-105"
                    style={{ backgroundColor: "var(--card)" }}
                    aria-label="Quitar predio"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
              {esPredioPreseleccionado(predio, index) && (
                <p className="rounded-lg bg-emerald-100 px-2.5 py-1.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200">
                  Predio principal vinculado al mapa
                </p>
              )}
              {esCreacionManual && !predio.modoManual ? (
                <SelectorLotePredio
                  catalogo={lotesComerciales}
                  cargando={cargandoLotes}
                  index={index}
                  inputStyle={inputStyle}
                  onBuscar={actualizarPredio}
                  onModoManual={cambiarModoLote}
                  onSeleccionar={seleccionarLote}
                  predio={predio}
                  predios={formData.predios}
                />
              ) : (
                <>
                  {esCreacionManual && predio.modoManual && (
                    <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-200">
                      <p className="font-semibold">Lote no registrado</p>
                      <p className="mt-1">
                        Usa estos campos únicamente cuando el lote aún no exista en el catálogo.
                      </p>
                    </div>
                  )}
                  <input
                    type="text"
                    placeholder="Numero de lote"
                    value={predio.numeroLote}
                    onChange={(e) => actualizarPredio(index, "numeroLote", e.target.value)}
                    readOnly={esPredioPreseleccionado(predio, index)}
                    className="w-full rounded p-2 read-only:cursor-not-allowed read-only:opacity-75"
                    style={inputStyle}
                  />
                  <input
                    type="text"
                    placeholder="Medida lineal (ej. 24x15)"
                    value={predio.medidaLote}
                    onChange={(e) => actualizarPredio(index, "medidaLote", e.target.value)}
                    readOnly={esPredioPreseleccionado(predio, index)}
                    className="w-full rounded p-2 read-only:cursor-not-allowed read-only:opacity-75"
                    style={inputStyle}
                  />
                  <input
                    type="text"
                    placeholder="Area (ej. 400 m2)"
                    value={predio.areaLote}
                    onChange={(e) => actualizarPredio(index, "areaLote", e.target.value)}
                    readOnly={esPredioPreseleccionado(predio, index)}
                    className="w-full rounded p-2 read-only:cursor-not-allowed read-only:opacity-75"
                    style={inputStyle}
                  />
                  {esCreacionManual && predio.modoManual && (
                    <button
                      type="button"
                      onClick={() => cambiarModoLote(index, false)}
                      className="text-left text-xs font-semibold underline-offset-2 hover:underline"
                      style={{ color: "var(--secondary)" }}
                    >
                      Seleccionar un lote existente
                    </button>
                  )}
                </>
              )}
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="Precio de este predio (opcional)"
                value={predio.precio}
                onChange={(e) => actualizarPredio(index, "precio", e.target.value)}
                className="w-full p-2 rounded"
                style={inputStyle}
              />
            </div>
          ))}
        </div>

        <input
          type="number"
          placeholder="Precio total de la venta"
          value={formData.monto}
          onChange={(e) => setFormData({ ...formData, monto: e.target.value })}
          className="w-full p-2 rounded"
          style={inputStyle}
        />

        {!isEdit && (
          <div>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="Enganche inicial (opcional)"
              value={formData.enganche}
              onChange={(e) => setFormData({ ...formData, enganche: e.target.value })}
              className="w-full p-2 rounded"
              style={inputStyle}
            />
            {enganche > 0 && (
              <p className="text-xs mt-1 opacity-60">
                Se registrara como abono inicial. Saldo despues del enganche: Q
                {saldoDespuesEnganche.toLocaleString("es-GT", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
            )}
          </div>
        )}

        <input
          type="number"
          placeholder="Número de cuotas (meses)"
          value={formData.cuotas}
          onChange={(e) => setFormData({ ...formData, cuotas: e.target.value })}
          className="w-full p-2 rounded"
          style={inputStyle}
        />
        {precio > 0 && cuotas > 0 && (
          <p className="text-xs -mt-2 opacity-60">
            Cuota mensual estimada: Q
            {cuotaMensual.toLocaleString("es-GT", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
        )}

        <input
          type="date"
          value={formData.fechaInicio}
          onChange={(e) => setFormData({ ...formData, fechaInicio: e.target.value })}
          className="w-full p-2 rounded"
          style={inputStyle}
        />

        <div>
          <input
            type="date"
            value={formData.fechaFin}
            readOnly
            className="w-full p-2 rounded cursor-not-allowed opacity-70"
            style={inputStyle}
          />
          {formData.fechaFin && (
            <p className="flex items-center gap-1 text-xs mt-1 opacity-60">
              <CalendarDays size={11} />
              Fecha fin calculada automáticamente ({formData.cuotas} meses desde el inicio)
            </p>
          )}
        </div>

        <div>
          <label className="text-sm font-semibold mb-1 block" style={{ color: "var(--text)" }}>
            Frecuencia de pago
          </label>
          <select
            value={formData.frecuenciaPago}
            onChange={(e) => setFormData({ ...formData, frecuenciaPago: e.target.value })}
            className="w-full p-2 rounded"
            style={inputStyle}
          >
            {FRECUENCIAS.map((frecuencia) => (
              <option key={frecuencia} value={frecuencia}>
                {frecuencia.charAt(0).toUpperCase() + frecuencia.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-semibold mb-1 block" style={{ color: "var(--text)" }}>
            Fecha de cobro pactada
          </label>
          <input
            type="date"
            value={formData.fechaCobro}
            onChange={(e) => setFormData({ ...formData, fechaCobro: e.target.value })}
            className="w-full p-2 rounded"
            style={inputStyle}
          />
          <p className="text-xs mt-1 opacity-60">
            Solo como referencia para saber cuándo corresponde registrar manualmente la cuota.
          </p>
        </div>

        {isEdit && (
          <div
            className="rounded-xl px-4 py-3 text-sm"
            style={{ backgroundColor: "var(--bg)", border: "1px solid var(--card-border)" }}
          >
            <p className="opacity-50 text-xs">
              Los cobros se registran manualmente para mantener control total del sistema.
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={formularioBloqueadoPorLote}
          className="w-full rounded p-2 font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          style={{ backgroundColor: "var(--secondary)" }}
        >
          {cargandoLoteMapa
            ? "Validando lote..."
            : guardandoVenta
              ? "Guardando venta..."
              : isEdit
                ? "Actualizar Venta"
                : "Crear Venta"}
        </button>
      </form>

      {toast && <Toast message={toast.message} type={toast.type} onClose={closeToast} />}
      <style>
        {`
          @keyframes clienteSelected {
            from { opacity: 0; transform: translateY(-6px) scale(0.98); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }

          @keyframes clienteOptions {
            from { opacity: 0; transform: translateY(-4px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}
      </style>
    </>
  );
}
