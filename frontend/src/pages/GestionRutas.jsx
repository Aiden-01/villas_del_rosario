import { useState, useEffect } from "react";
import useToast from "../hooks/useToast";
import Toast from "../components/Toast";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3333";
const DIAS = ["lunes","martes","miercoles","jueves","viernes","sabado","domingo"];

export default function GestionRutas() {
  const [rutas, setRutas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ nombre: "", descripcion: "", diaCobro: "lunes" });
  const [creando, setCreando] = useState(false);
  const [mostrarForm, setMostrarForm] = useState(false);
  const { toast, showToast, closeToast } = useToast();

  const cargarRutas = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/api/rutas`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setRutas(Array.isArray(data) ? data : []);
    } catch {
      showToast("Error al cargar rutas", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargarRutas(); }, []);

  const crearRuta = async () => {
    if (!form.nombre) return showToast("El nombre es obligatorio", "error");
    setCreando(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/api/rutas`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.message || "Error al crear ruta", "error");
        return;
      }
      showToast("Ruta creada exitosamente", "success");
      setForm({ nombre: "", descripcion: "", diaCobro: "lunes" });
      setMostrarForm(false);
      cargarRutas();
    } catch {
      showToast("Error al crear ruta", "error");
    } finally {
      setCreando(false);
    }
  };

  const eliminarRuta = async (id) => {
    if (!window.confirm("¿Eliminar esta ruta?")) return;
    try {
      const token = localStorage.getItem("token");
      await fetch(`${API_URL}/api/rutas/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      showToast("Ruta eliminada", "success");
      cargarRutas();
    } catch {
      showToast("Error al eliminar", "error");
    }
  };

  const DIAS_LABELS = {
    lunes: "Lunes", martes: "Martes", miercoles: "Miércoles",
    jueves: "Jueves", viernes: "Viernes", sabado: "Sábado", domingo: "Domingo"
  };

  return (
    <div className="pt-16 text-[var(--text)]">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">🗺️ Gestión de Rutas</h1>
          <p className="text-sm opacity-60 mt-1">Administra las rutas de cobro</p>
        </div>
        <button
          onClick={() => setMostrarForm(!mostrarForm)}
          className="text-white px-4 py-2 rounded-lg shadow hover:opacity-90 transition"
          style={{ backgroundColor: "var(--primary)" }}
        >
          {mostrarForm ? "Cancelar" : "+ Nueva Ruta"}
        </button>
      </div>

      {/* FORMULARIO */}
      {mostrarForm && (
        <div
          className="rounded-2xl p-5 mb-6 shadow"
          style={{ backgroundColor: "var(--card)", border: "1px solid var(--card-border)" }}
        >
          <h2 className="font-bold mb-4">Nueva Ruta</h2>
          <div className="space-y-3">
            <input
              placeholder="Nombre (ej: Ruta Dolores Centro)"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              className="w-full p-2 rounded"
              style={{ backgroundColor: "var(--bg)", color: "var(--text)", border: "1px solid var(--card-border)" }}
            />
            <input
              placeholder="Descripción (opcional)"
              value={form.descripcion}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
              className="w-full p-2 rounded"
              style={{ backgroundColor: "var(--bg)", color: "var(--text)", border: "1px solid var(--card-border)" }}
            />
            <select
              value={form.diaCobro}
              onChange={(e) => setForm({ ...form, diaCobro: e.target.value })}
              className="w-full p-2 rounded"
              style={{ backgroundColor: "var(--bg)", color: "var(--text)", border: "1px solid var(--card-border)" }}
            >
              {DIAS.map((d) => (
                <option key={d} value={d}>{DIAS_LABELS[d]}</option>
              ))}
            </select>
            <button
              onClick={crearRuta}
              disabled={creando}
              className="w-full py-2 rounded-lg font-semibold text-white hover:opacity-90 transition disabled:opacity-50"
              style={{ backgroundColor: "var(--primary)" }}
            >
              {creando ? "Creando..." : "+ Crear Ruta"}
            </button>
          </div>
        </div>
      )}

      {loading && <p className="opacity-60">Cargando rutas...</p>}

      {/* LISTA */}
      {!loading && rutas.length === 0 && (
        <div
          className="rounded-2xl p-10 text-center shadow"
          style={{ backgroundColor: "var(--card)", border: "1px solid var(--card-border)" }}
        >
          <p className="text-3xl mb-2">🗺️</p>
          <p className="font-semibold">No hay rutas creadas aún</p>
          <p className="text-sm opacity-60 mt-1">Crea una ruta para organizar tus cobros</p>
        </div>
      )}

      {!loading && rutas.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rutas.map((ruta) => (
            <div
              key={ruta.id}
              className="rounded-2xl shadow-md p-5 hover:scale-105 transition-all duration-200"
              style={{ backgroundColor: "var(--card)", border: "2px solid transparent" }}
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-bold text-base">{ruta.nombre}</h3>
                  {ruta.descripcion && (
                    <p className="text-sm opacity-60 mt-1">{ruta.descripcion}</p>
                  )}
                </div>
                <span
                  className="text-xs px-2 py-1 rounded-full font-semibold text-white"
                  style={{ backgroundColor: "var(--primary)" }}
                >
                  {DIAS_LABELS[ruta.diaCobro] || ruta.diaCobro}
                </span>
              </div>

              <div
                className="rounded-xl p-3 text-sm mb-3"
                style={{ backgroundColor: "var(--bg)" }}
              >
                <p><span className="font-semibold">📅 Día de cobro:</span> {DIAS_LABELS[ruta.diaCobro] || ruta.diaCobro}</p>
              </div>

              <button
                onClick={() => eliminarRuta(ruta.id)}
                className="w-full py-2 bg-red-500 text-white rounded-xl font-semibold hover:opacity-90 transition"
              >
                Eliminar
              </button>
            </div>
          ))}
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={closeToast} />}
    </div>
  );
}