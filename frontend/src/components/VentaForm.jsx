import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Toast from "./Toast";
import useToast from "../hooks/useToast";
import { User, Search, CalendarDays, CheckCircle2, Pencil, Plus, Trash2 } from "lucide-react";
import { authFetch } from "../services/api";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3333";
const FRECUENCIAS = ["mensual"];
const predioVacio = () => ({ numeroLote: "", medidaLote: "", areaLote: "", precio: "" });

export default function VentaForm({ mode, ventaId }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const clienteIdFromUrl = searchParams.get("clienteId");
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
  const isEdit = mode === "edit";

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

  useEffect(() => {
    obtenerClientes();
    if (isEdit && ventaId) obtenerVenta();
  }, [isEdit, obtenerClientes, obtenerVenta, ventaId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
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
      if (isEdit) {
        const res = await authFetch(`${API_URL}/api/ventas/${ventaId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error((await res.json()).message);
        showToast("Venta actualizada correctamente", "success");
      } else {
        const res = await authFetch(`${API_URL}/api/ventas`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error((await res.json()).message);
        showToast("Venta creada correctamente", "success");
      }
      setTimeout(() => navigate("/ventas"), 1500);
    } catch (error) {
      console.error(error);
      const mensaje = error?.message || "Error al guardar la venta";
      showToast(mensaje, "error");
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
        numeroLote: principal.numeroLote,
        medidaLote: principal.medidaLote,
        areaLote: principal.areaLote,
      };
    });
  };

  const agregarPredio = () => {
    setFormData((prev) => ({ ...prev, predios: [...prev.predios, predioVacio()] }));
  };

  const quitarPredio = (index) => {
    setFormData((prev) => {
      const predios = prev.predios.filter((_, predioIndex) => predioIndex !== index);
      const normalizados = predios.length > 0 ? predios : [predioVacio()];
      const principal = normalizados[0];

      return {
        ...prev,
        predios: normalizados,
        numeroLote: principal.numeroLote,
        medidaLote: principal.medidaLote,
        areaLote: principal.areaLote,
      };
    });
  };

  const precio = Number(formData.monto || 0);
  const enganche = Number(formData.enganche || 0);
  const saldoDespuesEnganche = Math.max(precio - enganche, 0);

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className="bg-[var(--card)] p-6 rounded-xl shadow-lg w-full max-w-md space-y-4"
      >
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

          {formData.predios.map((predio, index) => (
            <div
              key={index}
              className="space-y-2 rounded-xl p-3 transition-all duration-300 animate-[clienteOptions_0.22s_ease-out]"
              style={{ backgroundColor: "var(--bg)", border: "1px solid var(--card-border)" }}
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold opacity-70">Predio {index + 1}</p>
                {formData.predios.length > 1 && (
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
              <input
                type="text"
                placeholder="Numero de lote"
                value={predio.numeroLote}
                onChange={(e) => actualizarPredio(index, "numeroLote", e.target.value)}
                className="w-full p-2 rounded"
                style={inputStyle}
              />
              <input
                type="text"
                placeholder="Medida lineal (ej. 24x15)"
                value={predio.medidaLote}
                onChange={(e) => actualizarPredio(index, "medidaLote", e.target.value)}
                className="w-full p-2 rounded"
                style={inputStyle}
              />
              <input
                type="text"
                placeholder="Area (ej. 400 m2)"
                value={predio.areaLote}
                onChange={(e) => actualizarPredio(index, "areaLote", e.target.value)}
                className="w-full p-2 rounded"
                style={inputStyle}
              />
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
          className="w-full p-2 rounded text-white font-semibold hover:opacity-90 transition"
          style={{ backgroundColor: "var(--secondary)" }}
        >
          {isEdit ? "Actualizar Venta" : "Crear Venta"}
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
