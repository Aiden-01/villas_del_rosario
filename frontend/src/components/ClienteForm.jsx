import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Toast from "./Toast";
import useToast from "../hooks/useToast";

export default function ClienteForm({ mode, clienteId }) {
  const navigate = useNavigate();
  const { toast, showToast, closeToast } = useToast();

  const [formData, setFormData] = useState({
    dpi: "",
    nombres: "",
    apellidos: "",
    telefono: "",
    direccion: "",
  });

  const isEdit = mode === "edit";

  useEffect(() => {
    if (isEdit && clienteId) {
      obtenerCliente();
    }
  }, [clienteId]);

  const obtenerCliente = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `http://localhost:3333/api/clientes/${clienteId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const cliente = res.data;
      setFormData({
        dpi: cliente.dpi || "",
        nombres: cliente.nombres || "",
        apellidos: cliente.apellidos || "",
        telefono: cliente.telefono || "",
        direccion: cliente.direccion || "",
      });
    } catch (error) {
      console.error("Error cargando cliente:", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      if (isEdit) {
        await axios.put(
          `http://localhost:3333/api/clientes/${clienteId}`,
          formData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        showToast("Cliente actualizado correctamente", "success");
      } else {
        await axios.post("http://localhost:3333/api/clientes", formData, {
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
          className="w-full p-2 rounded bg-[var(--bg)] text-[var(--text)]"
        />
        <input
          type="text"
          placeholder="Nombres"
          value={formData.nombres}
          onChange={(e) => setFormData({ ...formData, nombres: e.target.value })}
          className="w-full p-2 rounded bg-[var(--bg)] text-[var(--text)]"
        />
        <input
          type="text"
          placeholder="Apellidos"
          value={formData.apellidos}
          onChange={(e) => setFormData({ ...formData, apellidos: e.target.value })}
          className="w-full p-2 rounded bg-[var(--bg)] text-[var(--text)]"
        />
        <input
          type="text"
          placeholder="Teléfono"
          value={formData.telefono}
          onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
          className="w-full p-2 rounded bg-[var(--bg)] text-[var(--text)]"
        />
        <input
          type="text"
          placeholder="Dirección"
          value={formData.direccion}
          onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
          className="w-full p-2 rounded bg-[var(--bg)] text-[var(--text)]"
        />
        <button
          type="submit"
          className="w-full bg-blue-600 p-2 rounded text-white font-semibold"
        >
          {isEdit ? "Actualizar Cliente" : "Crear Cliente"}
        </button>
      </form>

      {/* 👇 FUERA del form */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={closeToast} />}
    </>
  );
}