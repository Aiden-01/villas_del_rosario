import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate, useSearchParams } from "react-router-dom";
import Toast from "./Toast";
import useToast from "../hooks/useToast";
import { User, Search, CalendarDays } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3333";
const FRECUENCIAS = ["diario","semanal","quincenal"];

export default function PrestamoForm({ mode, prestamoId }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const clienteIdFromUrl = searchParams.get("clienteId");
  const { toast, showToast, closeToast } = useToast();

  const [formData, setFormData] = useState({
    clienteId: clienteIdFromUrl || "",
    monto: "",
    interes: "",
    cuotas: "",
    fechaInicio: "",
    fechaFin: "",
    frecuenciaPago: "semanal",
    // estado eliminado — lo controla el sistema automáticamente
  });

  const [clientes, setClientes] = useState([]);
  const [clientesFiltrados, setClientesFiltrados] = useState([]);
  const [busquedaCliente, setBusquedaCliente] = useState("");
  const [clientePreseleccionado, setClientePreseleccionado] = useState(null);
  const isEdit = mode === "edit";

  useEffect(() => {
    if (formData.fechaInicio && formData.cuotas) {
      const inicio = new Date(formData.fechaInicio);
      inicio.setDate(inicio.getDate() + Number(formData.cuotas) * 7);
      const fechaFin = inicio.toISOString().split("T")[0];
      setFormData((prev) => ({ ...prev, fechaFin }));
    }
  }, [formData.fechaInicio, formData.cuotas]);

  useEffect(() => {
    obtenerClientes();
    if (isEdit && prestamoId) obtenerPrestamo();
  }, [prestamoId]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!busquedaCliente.trim()) { setClientesFiltrados(clientes); return; }
      const term = busquedaCliente.toLowerCase();
      setClientesFiltrados(
        clientes.filter((c) => {
          const fullName = `${c.nombres} ${c.apellidos}`.toLowerCase();
          return fullName.includes(term) || c.dpi.includes(term);
        })
      );
    }, 250);
    return () => clearTimeout(timeout);
  }, [busquedaCliente, clientes]);

  const obtenerClientes = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_URL}/api/clientes`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setClientes(res.data);
      setClientesFiltrados(res.data);
      if (clienteIdFromUrl) {
        const encontrado = res.data.find((c) => c.id === parseInt(clienteIdFromUrl));
        if (encontrado) setClientePreseleccionado(encontrado);
      }
    } catch (error) {
      console.error("Error cargando clientes:", error);
    }
  };

  const obtenerPrestamo = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_URL}/api/prestamos/${prestamoId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const prestamo = res.data;
      setFormData({
        clienteId:      prestamo.clienteId      || "",
        monto:          prestamo.monto          || "",
        interes:        prestamo.interes        || "",
        cuotas:         prestamo.cuotas         || "",
        fechaInicio:    prestamo.fechaInicio?.split("T")[0] || "",
        fechaFin:       prestamo.fechaFin?.split("T")[0]   || "",
        frecuenciaPago: prestamo.frecuenciaPago || "semanal",
      });
    } catch (error) {
      console.error("Error cargando préstamo:", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      if (isEdit) {
        await axios.put(`${API_URL}/api/prestamos/${prestamoId}`, formData, {
          headers: { Authorization: `Bearer ${token}` },
        });
        showToast("Préstamo actualizado correctamente", "success");
      } else {
        await axios.post(`${API_URL}/api/prestamos`, formData, {
          headers: { Authorization: `Bearer ${token}` },
        });
        showToast("Préstamo creado correctamente", "success");
      }
      setTimeout(() => navigate("/prestamos"), 1500);
    } catch (error) {
      console.error(error);
      const mensaje = error?.response?.data?.message || "Error al guardar el préstamo";
      showToast(mensaje, "error");
    }
  };

  const inputStyle = {
    backgroundColor: "var(--bg)",
    color: "var(--text)",
    border: "1px solid var(--card-border)",
  };

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className="bg-[var(--card)] p-6 rounded-xl shadow-lg w-full max-w-md space-y-4"
      >
        {/* ── CLIENTE ── */}
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
                placeholder="Buscar por nombre o DPI..."
                value={busquedaCliente}
                onChange={(e) => setBusquedaCliente(e.target.value)}
                className="w-full pl-8 pr-3 py-2 rounded-lg text-sm focus:outline-none"
                style={inputStyle}
              />
              {busquedaCliente && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs opacity-50"
                  style={{ color: "var(--text)" }}>
                  {clientesFiltrados.length} resultado{clientesFiltrados.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>
            <select
              value={formData.clienteId}
              onChange={(e) => setFormData({ ...formData, clienteId: e.target.value })}
              className="w-full p-2 rounded-lg text-sm"
              style={inputStyle}
              size={clientesFiltrados.length > 0 && busquedaCliente ? Math.min(clientesFiltrados.length + 1, 6) : 1}
            >
              <option value="">— Seleccionar cliente —</option>
              {clientesFiltrados.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombres} {c.apellidos} — {c.dpi}
                </option>
              ))}
            </select>
            {busquedaCliente && clientesFiltrados.length === 0 && (
              <p className="text-xs text-center opacity-50 py-1" style={{ color: "var(--text)" }}>
                No se encontraron clientes con ese criterio.
              </p>
            )}
          </div>
        )}

        {/* ── MONTO ── */}
        <input
          type="number" placeholder="Monto"
          value={formData.monto}
          onChange={(e) => setFormData({ ...formData, monto: e.target.value })}
          className="w-full p-2 rounded" style={inputStyle}
        />

        {/* ── INTERÉS ── */}
        <input
          type="number" placeholder="Interés (%)"
          value={formData.interes}
          onChange={(e) => setFormData({ ...formData, interes: e.target.value })}
          className="w-full p-2 rounded" style={inputStyle}
        />

        {/* ── CUOTAS ── */}
        <input
          type="number" placeholder="Número de cuotas (semanas)"
          value={formData.cuotas}
          onChange={(e) => setFormData({ ...formData, cuotas: e.target.value })}
          className="w-full p-2 rounded" style={inputStyle}
        />

        {/* ── FECHA INICIO ── */}
        <input
          type="date" value={formData.fechaInicio}
          onChange={(e) => setFormData({ ...formData, fechaInicio: e.target.value })}
          className="w-full p-2 rounded" style={inputStyle}
        />

        {/* ── FECHA FIN (auto) ── */}
        <div>
          <input
            type="date" value={formData.fechaFin} readOnly
            className="w-full p-2 rounded cursor-not-allowed opacity-70" style={inputStyle}
          />
          {formData.fechaFin && (
            <p className="flex items-center gap-1 text-xs mt-1 opacity-60">
              <CalendarDays size={11} />
              Fecha fin calculada automáticamente ({formData.cuotas} semanas desde el inicio)
            </p>
          )}
        </div>

        {/* ── FRECUENCIA DE PAGO ── */}
        <div>
          <label className="text-sm font-semibold mb-1 block" style={{ color: "var(--text)" }}>
            Frecuencia de pago
          </label>
          <select
            value={formData.frecuenciaPago}
            onChange={(e) => setFormData({ ...formData, frecuenciaPago: e.target.value })}
            className="w-full p-2 rounded" style={inputStyle}
          >
            {FRECUENCIAS.map((f) => (
              <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>
            ))}
          </select>
        </div>

        {/* ── ESTADO — solo admin en edición ── */}
        {isEdit && (
          <div
            className="rounded-xl px-4 py-3 text-sm"
            style={{ backgroundColor: "var(--bg)", border: "1px solid var(--card-border)" }}
          >
            <p className="opacity-50 text-xs">
              El estado del préstamo es controlado automáticamente por el sistema.
              Solo un administrador puede modificarlo si es necesario.
            </p>
          </div>
        )}

        {/* ── SUBMIT ── */}
        <button
          type="submit"
          className="w-full p-2 rounded text-white font-semibold hover:opacity-90 transition"
          style={{ backgroundColor: "var(--secondary)" }}
        >
          {isEdit ? "Actualizar Préstamo" : "Crear Préstamo"}
        </button>
      </form>

      {toast && <Toast message={toast.message} type={toast.type} onClose={closeToast} />}
    </>
  );
}