import { useState, useEffect } from "react";
import useToast from "../hooks/useToast";
import Toast from "../components/Toast";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3333";
const DIAS = ["lunes","martes","miercoles","jueves","viernes","sabado","domingo"];
const DIAS_LABELS = {
  lunes: "Lunes", martes: "Martes", miercoles: "Miércoles",
  jueves: "Jueves", viernes: "Viernes", sabado: "Sábado", domingo: "Domingo"
};

export default function GestionRutas() {
  const [rutas, setRutas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ nombre: "", descripcion: "", diaCobro: "lunes" });
  const [creando, setCreando] = useState(false);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [rutaSeleccionada, setRutaSeleccionada] = useState(null);
  const [dragIndex, setDragIndex] = useState(null);
  const [dragClienteIndex, setDragClienteIndex] = useState(null);
  const { toast, showToast, closeToast } = useToast();

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const cargarDatos = async () => {
    try {
      const [resRutas, resClientes] = await Promise.all([
        fetch(`${API_URL}/api/rutas`, { headers }),
        fetch(`${API_URL}/api/clientes`, { headers }),
      ]);
      const dataRutas = await resRutas.json();
      const dataClientes = await resClientes.json();
      const rutasOrdenadas = (Array.isArray(dataRutas) ? dataRutas : [])
        .sort((a, b) => (a.orden || 0) - (b.orden || 0));
      setRutas(rutasOrdenadas);
      setClientes(Array.isArray(dataClientes) ? dataClientes : []);
    } catch {
      showToast("Error al cargar datos", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargarDatos(); }, []);

  const crearRuta = async () => {
    if (!form.nombre) return showToast("El nombre es obligatorio", "error");
    setCreando(true);
    try {
      const res = await fetch(`${API_URL}/api/rutas`, {
        method: "POST",
        headers,
        body: JSON.stringify({ ...form, orden: rutas.length + 1 }),
      });
      if (res.ok) {
        showToast("Ruta creada exitosamente", "success");
        setForm({ nombre: "", descripcion: "", diaCobro: "lunes" });
        setMostrarForm(false);
        cargarDatos();
      }
    } catch {
      showToast("Error al crear ruta", "error");
    } finally {
      setCreando(false);
    }
  };

  const eliminarRuta = async (id) => {
    if (!window.confirm("¿Eliminar esta ruta? Los clientes quedarán sin ruta asignada.")) return;
    try {
      await fetch(`${API_URL}/api/rutas/${id}`, { method: "DELETE", headers });
      showToast("Ruta eliminada", "success");
      if (rutaSeleccionada?.id === id) setRutaSeleccionada(null);
      cargarDatos();
    } catch {
      showToast("Error al eliminar", "error");
    }
  };

  // DRAG AND DROP — RUTAS
  const onDragStartRuta = (index) => setDragIndex(index);

  const onDropRuta = async (dropIndex) => {
    if (dragIndex === null || dragIndex === dropIndex) return;
    const nuevasRutas = [...rutas];
    const [moved] = nuevasRutas.splice(dragIndex, 1);
    nuevasRutas.splice(dropIndex, 0, moved);
    const rutasConOrden = nuevasRutas.map((r, i) => ({ ...r, orden: i + 1 }));
    setRutas(rutasConOrden);
    setDragIndex(null);

    try {
      await fetch(`${API_URL}/api/clientes/ordenar-rutas`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ ordenes: rutasConOrden.map(r => ({ id: r.id, orden: r.orden })) }),
      });
      showToast("Orden de rutas guardado", "success");
    } catch {
      showToast("Error al guardar orden", "error");
    }
  };

  // DRAG AND DROP — CLIENTES DENTRO DE RUTA
  const clientesDeRuta = rutaSeleccionada
    ? clientes
        .filter(c => c.rutaId === rutaSeleccionada.id)
        .sort((a, b) => (a.ordenVisita || 0) - (b.ordenVisita || 0))
    : [];

  const onDragStartCliente = (index) => setDragClienteIndex(index);

  const onDropCliente = async (dropIndex) => {
    if (dragClienteIndex === null || dragClienteIndex === dropIndex) return;
    const nuevos = [...clientesDeRuta];
    const [moved] = nuevos.splice(dragClienteIndex, 1);
    nuevos.splice(dropIndex, 0, moved);
    const conOrden = nuevos.map((c, i) => ({ ...c, ordenVisita: i + 1 }));

    setClientes(prev => {
      const sinRuta = prev.filter(c => c.rutaId !== rutaSeleccionada.id);
      return [...sinRuta, ...conOrden];
    });
    setDragClienteIndex(null);

    try {
      await fetch(`${API_URL}/api/clientes/ordenar`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ ordenes: conOrden.map(c => ({ id: c.id, ordenVisita: c.ordenVisita })) }),
      });
      showToast("Orden de clientes guardado", "success");
    } catch {
      showToast("Error al guardar orden", "error");
    }
  };

  return (
    <div className="pt-16 text-[var(--text)]">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">🗺️ Gestión de Rutas</h1>
          <p className="text-sm opacity-60 mt-1">Organiza y ordena tus zonas de cobro</p>
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
        <div className="rounded-2xl p-5 mb-6 shadow"
          style={{ backgroundColor: "var(--card)", border: "1px solid var(--card-border)" }}>
          <h2 className="font-bold mb-4">Nueva Ruta / Zona</h2>
          <div className="space-y-3">
            <input
              placeholder="Nombre (ej: El Chal - Casco Urbano)"
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

      {loading && <p className="opacity-60">Cargando...</p>}

      {!loading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* COLUMNA IZQUIERDA — LISTA DE RUTAS ORDENABLES */}
          <div>
            <h2 className="font-bold mb-3 text-lg">
              📋 Orden de visita de zonas
            </h2>
            <p className="text-sm opacity-60 mb-4">Arrastra para reordenar en qué zona cobras primero</p>

            {rutas.length === 0 && (
              <div className="rounded-2xl p-8 text-center"
                style={{ backgroundColor: "var(--card)", border: "1px solid var(--card-border)" }}>
                <p className="text-2xl mb-2">🗺️</p>
                <p className="font-semibold">No hay rutas creadas</p>
              </div>
            )}

            <div className="space-y-2">
              {rutas.map((ruta, index) => {
                const clientesEnRuta = clientes.filter(c => c.rutaId === ruta.id);
                return (
                  <div
                    key={ruta.id}
                    draggable
                    onDragStart={() => onDragStartRuta(index)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => onDropRuta(index)}
                    onClick={() => setRutaSeleccionada(rutaSeleccionada?.id === ruta.id ? null : ruta)}
                    className="rounded-2xl p-4 cursor-pointer hover:scale-[1.01] transition-all shadow-md select-none"
                    style={{
                      backgroundColor: "var(--card)",
                      border: rutaSeleccionada?.id === ruta.id
                        ? "2px solid var(--primary)"
                        : "2px solid transparent",
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl opacity-40 cursor-grab">⠿</span>
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                        style={{ backgroundColor: "var(--primary)" }}
                      >
                        {ruta.orden || index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-bold">{ruta.nombre}</p>
                        {ruta.descripcion && (
                          <p className="text-xs opacity-60">{ruta.descripcion}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-1 rounded-full text-white"
                          style={{ backgroundColor: "var(--secondary)" }}>
                          {clientesEnRuta.length} clientes
                        </span>
                        <button
                          onClick={(e) => { e.stopPropagation(); eliminarRuta(ruta.id); }}
                          className="text-red-400 hover:text-red-600 transition text-sm font-bold"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* COLUMNA DERECHA — CLIENTES DE LA RUTA SELECCIONADA */}
          <div>
            <h2 className="font-bold mb-3 text-lg">
              👥 {rutaSeleccionada ? `Clientes — ${rutaSeleccionada.nombre}` : "Selecciona una ruta"}
            </h2>
            <p className="text-sm opacity-60 mb-4">
              {rutaSeleccionada ? "Arrastra para cambiar el orden de visita" : "Haz clic en una ruta para ver sus clientes"}
            </p>

            {!rutaSeleccionada && (
              <div className="rounded-2xl p-8 text-center"
                style={{ backgroundColor: "var(--card)", border: "1px solid var(--card-border)" }}>
                <p className="text-2xl mb-2">👈</p>
                <p className="font-semibold">Selecciona una ruta</p>
                <p className="text-sm opacity-60 mt-1">para ver y ordenar sus clientes</p>
              </div>
            )}

            {rutaSeleccionada && clientesDeRuta.length === 0 && (
              <div className="rounded-2xl p-8 text-center"
                style={{ backgroundColor: "var(--card)", border: "1px solid var(--card-border)" }}>
                <p className="text-2xl mb-2">👤</p>
                <p className="font-semibold">Sin clientes asignados</p>
                <p className="text-sm opacity-60 mt-1">Edita un cliente y asígnale esta ruta</p>
              </div>
            )}

            {rutaSeleccionada && clientesDeRuta.length > 0 && (
              <div className="space-y-2">
                {clientesDeRuta.map((cliente, index) => (
                  <div
                    key={cliente.id}
                    draggable
                    onDragStart={() => onDragStartCliente(index)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => onDropCliente(index)}
                    className="rounded-2xl p-4 cursor-grab shadow-md select-none hover:scale-[1.01] transition-all"
                    style={{
                      backgroundColor: "var(--card)",
                      border: "1px solid var(--card-border)",
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl opacity-40">⠿</span>
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                        style={{ backgroundColor: "var(--primary)" }}
                      >
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-bold">{cliente.nombres} {cliente.apellidos}</p>
                        <p className="text-xs opacity-60">📍 {cliente.zona || cliente.direccion}</p>
                        <p className="text-xs opacity-60">📞 {cliente.telefono}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={closeToast} />}
    </div>
  );
}