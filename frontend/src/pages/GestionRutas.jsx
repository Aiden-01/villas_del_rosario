import { useState, useEffect } from "react";
import { authFetch } from "../services/api";
import useToast from "../hooks/useToast";
import Toast from "../components/Toast";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3333";
const DIAS = ["lunes","martes","miercoles","jueves","viernes","sabado","domingo"];

export default function GestionRutas() {
  const [rutas, setRutas] = useState([]);
  const [form, setForm] = useState({ nombre: "", descripcion: "", diaCobro: "lunes" });
  const [creando, setCreando] = useState(false);
  const { toast, showToast, closeToast } = useToast();

  const cargarRutas = async () => {
    try {
      const res = await authFetch(`${API_URL}/api/rutas`);
      const data = await res.json();
      setRutas(Array.isArray(data) ? data : []);
    } catch {
      showToast("Error al cargar rutas", "error");
    }
  };

  useEffect(() => { cargarRutas(); }, []);

  const crearRuta = async () => {
    if (!form.nombre) return showToast("El nombre es obligatorio", "error");
    setCreando(true);
    try {
      const res = await authFetch(`${API_URL}/api/rutas`, {
        method: "POST",
        body: JSON.stringify(form),
      });
      if (res.ok) {
        showToast("Ruta creada exitosamente", "success");
        setForm({ nombre: "", descripcion: "", diaCobro: "lunes" });
        cargarRutas();
      }
    } catch {
      showToast("Error al crear ruta", "error");
    } finally {
      setCreando(false);
    }
  };

  const eliminarRuta = async (id) => {
    if (!confirm("¿Eliminar esta ruta?")) return;
    try {
      await authFetch(`${API_URL}/api/rutas/${id}`, { method: "DELETE" });
      showToast("Ruta eliminada", "success");
      cargarRutas();
    } catch {
      showToast("Error al eliminar", "error");
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 pb-10">
      {toast && <Toast message={toast.message} type={toast.type} onClose={closeToast} />}

      <h1 className="text-2xl font-bold mb-6" style={{ color: "var(--text)" }}>
        Gestión de Rutas
      </h1>

      {/* FORMULARIO */}
      <div className="rounded-2xl p-5 mb-6 shadow" style={{ backgroundColor: "var(--card)", border: "1px solid var(--card-border)" }}>
        <h2 className="font-bold mb-4" style={{ color: "var(--text)" }}>Nueva Ruta</h2>
        <div className="space-y-3">
          <input
            placeholder="Nombre (ej: Ruta Dolores Centro)"
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            className="w-full px-4 py-2 rounded-xl outline-none"
            style={{ backgroundColor: "var(--input)", color: "var(--text)", border: "1px solid var(--card-border)" }}
          />
          <input
            placeholder="Descripción (opcional)"
            value={form.descripcion}
            onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
            className="w-full px-4 py-2 rounded-xl outline-none"
            style={{ backgroundColor: "var(--input)", color: "var(--text)", border: "1px solid var(--card-border)" }}
          />
          <select
            value={form.diaCobro}
            onChange={(e) => setForm({ ...form, diaCobro: e.target.value })}
            className="w-full px-4 py-2 rounded-xl outline-none"
            style={{ backgroundColor: "var(--input)", color: "var(--text)", border: "1px solid var(--card-border)" }}
          >
            {DIAS.map((d) => (
              <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>
            ))}
          </select>
          <button
            onClick={crearRuta}
            disabled={creando}
            className="w-full py-2 rounded-xl font-bold text-white transition hover:opacity-90"
            style={{ backgroundColor: "var(--primary)" }}
          >
            {creando ? "Creando..." : "+ Crear Ruta"}
          </button>
        </div>
      </div>

      {/* LISTA */}
      <div className="space-y-3">
        {rutas.map((ruta) => (
          <div
            key={ruta.id}
            className="rounded-2xl p-4 flex justify-between items-center shadow"
            style={{ backgroundColor: "var(--card)", border: "1px solid var(--card-border)" }}
          >
            <div>
              <p className="font-bold" style={{ color: "var(--text)" }}>{ruta.nombre}</p>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                📅 {ruta.diaCobro} {ruta.descripcion && `— ${ruta.descripcion}`}
              </p>
            </div>
            <button
              onClick={() => eliminarRuta(ruta.id)}
              className="text-red-500 hover:opacity-70 transition font-bold"
            >
              Eliminar
            </button>
          </div>
        ))}
        {rutas.length === 0 && (
          <p className="text-center py-8" style={{ color: "var(--text-muted)" }}>
            No hay rutas creadas aún.
          </p>
        )}
      </div>
    </div>
  );
}