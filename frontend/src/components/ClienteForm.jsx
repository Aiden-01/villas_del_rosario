import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Toast from "./Toast";
import useToast from "../hooks/useToast";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3333";

export default function ClienteForm({ mode, clienteId }) {
  const navigate = useNavigate();
  const { toast, showToast, closeToast } = useToast();
  const [rutas, setRutas] = useState([]);

  const [formData, setFormData] = useState({
    dpi: "",
    nombres: "",
    apellidos: "",
    telefono: "",
    direccion: "",
    zona: "",
    rutaId: "",
    ordenVisita: "",
  });

  const isEdit = mode === "edit";

  const inputStyle = {
    backgroundColor: "var(--bg)",
    color: "var(--text)",
    border: "1px solid var(--card-border)",
  };

  useEffect(() => {
    cargarRutas();
    if (isEdit && clienteId) obtenerCliente();
  }, [clienteId]);

  const cargarRutas = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_URL}/api/rutas`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRutas(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error("Error cargando rutas:", error);
    }
  };

  const obtenerCliente = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_URL}/api/clientes/${clienteId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const cliente = res.data;
      setFormData({
        dpi: cliente.dpi || "",
        nombres: cliente.nombres || "",
        apellidos: cliente.apellidos || "",
        telefono: cliente.telefono || "",
        direccion: cliente.direccion || "",
        zona: cliente.zona || "",
        rutaId: cliente.rutaId || "",
        ordenVisita: cliente.ordenVisita || "",
      });
    } catch (error) {
      console.error("Error cargando cliente:", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      const payload = {
        ...formData,
        rutaId: formData.rutaId ? Number(formData.rutaId) : null,
        ordenVisita: formData.ordenVisita ? Number(formData.ordenVisita) : null,
      };

      if (isEdit) {
        await axios.put(`${API_URL}/api/clientes/${clienteId}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        showToast("Cliente actualizado correctamente", "success");
      } else {
        await axios.post(`${API_URL}/api/clientes`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        showToast("Cliente creado correctamente", "success");
      }
      setTimeout(() => navigate("/clientes"), 1500);
    } catch (error) {
      console.error(error);
      showToast("Error al guardar el cliente", "error");
    }
  };

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className="bg-[var(--card)] p-6 rounded-xl shadow-lg w-full max-w-md space-y-4"
      >
        <input
          type="text"
          placeholder="DPI"
          value={formData.dpi}
          onChange={(e) => setFormData({ ...formData, dpi: e.target.value })}
          className="w-full p-2 rounded"
          style={inputStyle}
        />
        <input
          type="text"
          placeholder="Nombres"
          value={formData.nombres}
          onChange={(e) => setFormData({ ...formData, nombres: e.target.value })}
          className="w-full p-2 rounded"
          style={inputStyle}
        />
        <input
          type="text"
          placeholder="Apellidos"
          value={formData.apellidos}
          onChange={(e) => setFormData({ ...formData, apellidos: e.target.value })}
          className="w-full p-2 rounded"
          style={inputStyle}
        />
        <input
          type="text"
          placeholder="Teléfono"
          value={formData.telefono}
          onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
          className="w-full p-2 rounded"
          style={inputStyle}
        />
        <input
          type="text"
          placeholder="Dirección"
          value={formData.direccion}
          onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
          className="w-full p-2 rounded"
          style={inputStyle}
        />

        {/* ZONA */}
        <div>
          <label className="text-sm font-semibold mb-1 block" style={{ color: "var(--text)" }}>
            Zona / Sector
          </label>
          <input
            type="text"
            placeholder="Ej: El Chal - Barrio Minerva"
            value={formData.zona}
            onChange={(e) => setFormData({ ...formData, zona: e.target.value })}
            className="w-full p-2 rounded"
            style={inputStyle}
          />
        </div>

        {/* RUTA */}
        <div>
          <label className="text-sm font-semibold mb-1 block" style={{ color: "var(--text)" }}>
            Ruta asignada
          </label>
          <select
            value={formData.rutaId}
            onChange={(e) => setFormData({ ...formData, rutaId: e.target.value })}
            className="w-full p-2 rounded"
            style={inputStyle}
          >
            <option value="">Sin ruta asignada</option>
            {rutas.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nombre}
              </option>
            ))}
          </select>
        </div>

        {/* ORDEN */}
        <div>
          <label className="text-sm font-semibold mb-1 block" style={{ color: "var(--text)" }}>
            Orden de visita
          </label>
          <input
            type="number"
            placeholder="Ej: 1, 2, 3..."
            value={formData.ordenVisita}
            onChange={(e) => setFormData({ ...formData, ordenVisita: e.target.value })}
            className="w-full p-2 rounded"
            style={inputStyle}
          />
          <p className="text-xs mt-1 opacity-60">
            Número que indica en qué posición se visita dentro de su zona
          </p>
        </div>

        <button
          type="submit"
          className="w-full p-2 rounded text-white font-semibold hover:opacity-90 transition"
          style={{ backgroundColor: "var(--secondary)" }}
        >
          {isEdit ? "Actualizar Cliente" : "Crear Cliente"}
        </button>
      </form>

      {toast && <Toast message={toast.message} type={toast.type} onClose={closeToast} />}
    </>
  );
}