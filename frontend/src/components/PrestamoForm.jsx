import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate, useSearchParams } from "react-router-dom";
import Toast from "./Toast";
import useToast from "../hooks/useToast";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3333";
const DIAS = ["lunes","martes","miercoles","jueves","viernes","sabado","domingo"];
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
    estado: "activo",
    frecuenciaPago: "semanal",
    diaVisita: "lunes",
  });

  const [clientes, setClientes] = useState([]);
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
    if (isEdit && prestamoId) {
      obtenerPrestamo();
    }
  }, [prestamoId]);

  const obtenerClientes = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_URL}/api/clientes`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setClientes(res.data);
      if (clienteIdFromUrl) {
        const encontrado = res.data.find(
          (c) => c.id === parseInt(clienteIdFromUrl)
        );
        if (encontrado) setClientePreseleccionado(encontrado);
      }
    } catch (error) {
      console.error("Error cargando clientes:", error);
    }
  };

  const obtenerPrestamo = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `${API_URL}/api/prestamos/${prestamoId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const prestamo = res.data;
      setFormData({
        clienteId: prestamo.clienteId || "",
        monto: prestamo.monto || "",
        interes: prestamo.interes || "",
        cuotas: prestamo.cuotas || "",
        fechaInicio: prestamo.fechaInicio?.split("T")[0] || "",
        fechaFin: prestamo.fechaFin?.split("T")[0] || "",
        estado: prestamo.estado || "activo",
        frecuenciaPago: prestamo.frecuenciaPago || "semanal",
        diaVisita: prestamo.diaVisita || "lunes",
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
        await axios.put(
          `${API_URL}/api/prestamos/${prestamoId}`,
          formData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
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
      showToast("Error al guardar el préstamo", "error");
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
        {/* CLIENTE */}
        {clientePreseleccionado && !isEdit ? (
          <div
            className="w-full p-2 rounded font-semibold"
            style={inputStyle}
          >
            👤 {clientePreseleccionado.nombres} {clientePreseleccionado.apellidos}
          </div>
        ) : (
          <select
            value={formData.clienteId}
            onChange={(e) => setFormData({ ...formData, clienteId: e.target.value })}
            className="w-full p-2 rounded"
            style={inputStyle}
          >
            <option value="">Seleccionar cliente</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombres} {c.apellidos} — {c.dpi}
              </option>
            ))}
          </select>
        )}

        <input
          type="number"
          placeholder="Monto"
          value={formData.monto}
          onChange={(e) => setFormData({ ...formData, monto: e.target.value })}
          className="w-full p-2 rounded"
          style={inputStyle}
        />

        <input
          type="number"
          placeholder="Interés (%)"
          value={formData.interes}
          onChange={(e) => setFormData({ ...formData, interes: e.target.value })}
          className="w-full p-2 rounded"
          style={inputStyle}
        />

        <input
          type="number"
          placeholder="Número de cuotas (semanas)"
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
            <p className="text-xs mt-1 opacity-60">
              📅 Fecha fin calculada automáticamente ({formData.cuotas} semanas desde el inicio)
            </p>
          )}
        </div>

        {/* FRECUENCIA DE PAGO */}
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
            {FRECUENCIAS.map((f) => (
              <option key={f} value={f}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* DÍA DE VISITA */}
        <div>
          <label className="text-sm font-semibold mb-1 block" style={{ color: "var(--text)" }}>
            Día de visita
          </label>
          <select
            value={formData.diaVisita}
            onChange={(e) => setFormData({ ...formData, diaVisita: e.target.value })}
            className="w-full p-2 rounded"
            style={inputStyle}
          >
            {DIAS.map((d) => (
              <option key={d} value={d}>
                {d.charAt(0).toUpperCase() + d.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {isEdit && (
          <select
            value={formData.estado}
            onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
            className="w-full p-2 rounded"
            style={inputStyle}
          >
            <option value="activo">Activo</option>
            <option value="pagado">Pagado</option>
            <option value="vencido">Vencido</option>
          </select>
        )}

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