import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Toast from "./Toast";
import useToast from "../hooks/useToast";
import { User, Search, CalendarDays } from "lucide-react";
import { authFetch } from "../services/api";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3333";
const FRECUENCIAS = ["mensual"];

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
    fechaCobro: "",
    enganche: "",
    interes: 0,
  });

  const [clientes, setClientes] = useState([]);
  const [clientesFiltrados, setClientesFiltrados] = useState([]);
  const [busquedaCliente, setBusquedaCliente] = useState("");
  const [clientePreseleccionado, setClientePreseleccionado] = useState(null);
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
    try {
      if (isEdit) {
        const res = await authFetch(`${API_URL}/api/ventas/${ventaId}`, {
          method: "PUT",
          body: JSON.stringify(formData),
        });
        if (!res.ok) throw new Error((await res.json()).message);
        showToast("Venta actualizada correctamente", "success");
      } else {
        const res = await authFetch(`${API_URL}/api/ventas`, {
          method: "POST",
          body: JSON.stringify(formData),
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
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nombre, teléfono o dirección..."
                value={busquedaCliente}
                onChange={(e) => setBusquedaCliente(e.target.value)}
                className="w-full pl-8 pr-3 py-2 rounded-lg text-sm focus:outline-none"
                style={inputStyle}
              />
            </div>
            <select
              value={formData.clienteId}
              onChange={(e) => setFormData({ ...formData, clienteId: e.target.value })}
              className="w-full p-2 rounded-lg text-sm"
              style={inputStyle}
              size={clientesFiltrados.length > 0 && busquedaCliente ? Math.min(clientesFiltrados.length + 1, 6) : 1}
            >
              <option value="">- Seleccionar cliente -</option>
              {clientesFiltrados.map((cliente) => (
                <option key={cliente.id} value={cliente.id}>
                  {cliente.nombres} {cliente.apellidos} - {cliente.telefono}
                </option>
              ))}
            </select>
          </div>
        )}

        <input
          type="text"
          placeholder="Número de lote"
          value={formData.numeroLote}
          onChange={(e) => setFormData({ ...formData, numeroLote: e.target.value })}
          className="w-full p-2 rounded"
          style={inputStyle}
        />

        <input
          type="text"
          placeholder="Medida lineal del lote (ej. 24x15)"
          value={formData.medidaLote}
          onChange={(e) => setFormData({ ...formData, medidaLote: e.target.value })}
          className="w-full p-2 rounded"
          style={inputStyle}
        />

        <input
          type="text"
          placeholder="Área del lote (ej. 400 m2)"
          value={formData.areaLote}
          onChange={(e) => setFormData({ ...formData, areaLote: e.target.value })}
          className="w-full p-2 rounded"
          style={inputStyle}
        />

        <input
          type="number"
          placeholder="Precio del lote"
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
    </>
  );
}
