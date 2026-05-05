import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate, useSearchParams } from "react-router-dom";
import Toast from "./Toast";
import useToast from "../hooks/useToast";
import { User, Search, CalendarDays } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3333";
const FRECUENCIAS = ["mensual"];

export default function PrestamoForm({ mode, prestamoId }) {
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
    obtenerClientes();
    if (isEdit && prestamoId) obtenerPrestamo();
  }, [prestamoId]);

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

  const obtenerClientes = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_URL}/api/clientes`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setClientes(res.data);
      setClientesFiltrados(res.data);
      if (clienteIdFromUrl) {
        const encontrado = res.data.find((cliente) => cliente.id === parseInt(clienteIdFromUrl));
        if (encontrado) setClientePreseleccionado(encontrado);
      }
    } catch (error) {
      console.error("Error cargando clientes:", error);
    }
  };

  const obtenerPrestamo = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_URL}/api/ventas/${prestamoId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const prestamo = res.data;
      setFormData({
        clienteId: prestamo.clienteId || "",
        monto: prestamo.monto || "",
        cuotas: prestamo.cuotas || "",
        fechaInicio: prestamo.fechaInicio?.split("T")[0] || "",
        fechaFin: prestamo.fechaFin?.split("T")[0] || "",
        frecuenciaPago: prestamo.frecuenciaPago || "mensual",
        numeroLote: prestamo.numeroLote || "",
        medidaLote: prestamo.medidaLote || "",
        areaLote: prestamo.areaLote || "",
        fechaCobro: prestamo.fechaCobro?.split("T")[0] || "",
        interes: 0,
      });
    } catch (error) {
      console.error("Error cargando venta:", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      if (isEdit) {
        await axios.put(`${API_URL}/api/ventas/${prestamoId}`, formData, {
          headers: { Authorization: `Bearer ${token}` },
        });
        showToast("Venta actualizada correctamente", "success");
      } else {
        await axios.post(`${API_URL}/api/ventas`, formData, {
          headers: { Authorization: `Bearer ${token}` },
        });
        showToast("Venta creada correctamente", "success");
      }
      setTimeout(() => navigate("/ventas"), 1500);
    } catch (error) {
      console.error(error);
      const mensaje = error?.response?.data?.message || "Error al guardar la venta";
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
