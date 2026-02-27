import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate, useSearchParams } from "react-router-dom";

export default function PrestamoForm({ mode, prestamoId }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const clienteIdFromUrl = searchParams.get("clienteId");

  const [formData, setFormData] = useState({
    clienteId: clienteIdFromUrl || "",
    monto: "",
    interes: "",
    cuotas: "",
    fechaInicio: "",
    fechaFin: "",
    estado: "activo",
  });

  const [clientes, setClientes] = useState([]);
  const [clientePreseleccionado, setClientePreseleccionado] = useState(null);
  const isEdit = mode === "edit";

  // CALCULAR FECHA FIN AUTOMÁTICAMENTE (tanto en crear como editar)
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
      const res = await axios.get("http://localhost:3333/api/clientes", {
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
        `http://localhost:3333/api/prestamos/${prestamoId}`,
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
          `http://localhost:3333/api/prestamos/${prestamoId}`,
          formData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        alert("Préstamo actualizado correctamente");
      } else {
        await axios.post("http://localhost:3333/api/prestamos", formData, {
          headers: { Authorization: `Bearer ${token}` },
        });
        alert("Préstamo creado correctamente");
      }
      navigate("/prestamos");
    } catch (error) {
      console.error(error);
      alert("Error al guardar el préstamo");
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-[var(--card)] p-6 rounded-xl shadow-lg w-full max-w-md space-y-4"
    >
      {/* CLIENTE */}
      {clientePreseleccionado && !isEdit ? (
        <div
          className="w-full p-2 rounded font-semibold"
          style={{
            backgroundColor: "var(--bg)",
            color: "var(--text)",
            border: "1px solid var(--card-border)",
          }}
        >
          👤 {clientePreseleccionado.nombres} {clientePreseleccionado.apellidos}
        </div>
      ) : (
        <select
          value={formData.clienteId}
          onChange={(e) => setFormData({ ...formData, clienteId: e.target.value })}
          className="w-full p-2 rounded"
          style={{ backgroundColor: "var(--bg)", color: "var(--text)" }}
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
        style={{ backgroundColor: "var(--bg)", color: "var(--text)" }}
      />

      <input
        type="number"
        placeholder="Interés (%)"
        value={formData.interes}
        onChange={(e) => setFormData({ ...formData, interes: e.target.value })}
        className="w-full p-2 rounded"
        style={{ backgroundColor: "var(--bg)", color: "var(--text)" }}
      />

      <input
        type="number"
        placeholder="Número de cuotas (semanas)"
        value={formData.cuotas}
        onChange={(e) => setFormData({ ...formData, cuotas: e.target.value })}
        className="w-full p-2 rounded"
        style={{ backgroundColor: "var(--bg)", color: "var(--text)" }}
      />

      <input
        type="date"
        value={formData.fechaInicio}
        onChange={(e) => setFormData({ ...formData, fechaInicio: e.target.value })}
        className="w-full p-2 rounded"
        style={{ backgroundColor: "var(--bg)", color: "var(--text)" }}
      />

      {/* FECHA FIN — solo lectura, calculada automáticamente */}
      <div>
        <input
          type="date"
          value={formData.fechaFin}
          readOnly
          className="w-full p-2 rounded cursor-not-allowed opacity-70"
          style={{ backgroundColor: "var(--bg)", color: "var(--text)" }}
        />
        {formData.fechaFin && (
          <p className="text-xs mt-1 opacity-60">
            📅 Fecha fin calculada automáticamente ({formData.cuotas} semanas desde el inicio)
          </p>
        )}
      </div>

      {isEdit && (
        <select
          value={formData.estado}
          onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
          className="w-full p-2 rounded"
          style={{ backgroundColor: "var(--bg)", color: "var(--text)" }}
        >
          <option value="activo">Activo</option>
          <option value="pagado">Pagado</option>
          <option value="vencido">Vencido</option>
        </select>
      )}

      <button
        type="submit"
        className="w-full bg-blue-600 p-2 rounded text-white font-semibold hover:opacity-90"
      >
        {isEdit ? "Actualizar Préstamo" : "Crear Préstamo"}
      </button>
    </form>
  );
}