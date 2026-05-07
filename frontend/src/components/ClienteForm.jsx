import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Toast from "./Toast";
import useToast from "../hooks/useToast";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3333";

export default function ClienteForm({ mode, clienteId }) {
  const navigate = useNavigate();
  const { toast, showToast, closeToast } = useToast();

  const [formData, setFormData] = useState({
    nombres: "",
    apellidos: "",
    telefono: "",
    direccion: "",
    zona: "",
  });

  const isEdit = mode === "edit";

  const inputStyle = {
    backgroundColor: "var(--bg)",
    color: "var(--text)",
    border: "1px solid var(--card-border)",
  };

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const token = localStorage.getItem("token");

        if (isEdit && clienteId) {
          const resCliente = await axios.get(`${API_URL}/api/clientes/${clienteId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const cliente = resCliente.data;
          setFormData({
            nombres: cliente.nombres || "",
            apellidos: cliente.apellidos || "",
            telefono: cliente.telefono || "",
            direccion: cliente.direccion || "",
            zona: cliente.zona || "",
          });
        }
      } catch (error) {
        console.error("Error cargando datos del cliente:", error);
      }
    };

    cargarDatos();
  }, [clienteId, isEdit]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");

      if (isEdit) {
        await axios.put(`${API_URL}/api/clientes/${clienteId}`, formData, {
          headers: { Authorization: `Bearer ${token}` },
        });
        showToast("Cliente actualizado correctamente", "success");
      } else {
        await axios.post(`${API_URL}/api/clientes`, formData, {
          headers: { Authorization: `Bearer ${token}` },
        });
        showToast("Cliente creado correctamente", "success");
      }
      setTimeout(() => navigate("/clientes"), 1500);
    } catch (error) {
      const mensaje = error?.response?.data?.message || "Error al guardar el cliente";
      showToast(mensaje, "error");
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
          placeholder="Telefono"
          value={formData.telefono}
          onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
          className="w-full p-2 rounded"
          style={inputStyle}
        />
        <input
          type="text"
          placeholder="Direccion"
          value={formData.direccion}
          onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
          className="w-full p-2 rounded"
          style={inputStyle}
        />

        <div>
          <label className="text-sm font-semibold mb-1 block" style={{ color: "var(--text)" }}>
            Zona / Sector
          </label>
          <input
            type="text"
            placeholder="Ej: El Chal - Barrio El Paraiso"
            value={formData.zona}
            onChange={(e) => setFormData({ ...formData, zona: e.target.value })}
            className="w-full p-2 rounded"
            style={inputStyle}
          />
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
