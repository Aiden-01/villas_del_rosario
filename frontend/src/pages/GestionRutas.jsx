import { useState, useEffect } from "react";
import useToast from "../hooks/useToast";
import Toast from "../components/Toast";
import { useDragSort } from "../hooks/useDragSort";
import {
  Map, Plus, X, Check, ListOrdered,
  MapPin, Phone, Users, GripVertical,
  ClipboardList, MousePointerClick, UserX,
  Pencil, CalendarDays
} from "lucide-react";

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
  const [editandoPrioridad, setEditandoPrioridad] = useState(false);
  const [prioridades, setPrioridades] = useState({});
  const [rutaEditando, setRutaEditando] = useState(null);
  const [diaCobroEdit, setDiaCobroEdit] = useState("lunes");
  const [guardandoDia, setGuardandoDia] = useState(false);
  const [panelVisible, setPanelVisible] = useState(false);

  const { toast, showToast, closeToast } = useToast();
  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  // ✅ Ahora destructuramos containerHandlers y handleHandlers también
  const {
    containerHandlers: containerHandlersRuta,
    handleHandlers: handleHandlersRuta,
  } = useDragSort({
    items: rutas,
    onReorder: async (nuevasRutas) => {
      const rutasConOrden = nuevasRutas.map((r, i) => ({ ...r, orden: i + 1 }));
      setRutas(rutasConOrden);
      try {
        await fetch(`${API_URL}/api/clientes/ordenar-rutas`, {
          method: "PUT", headers,
          body: JSON.stringify({ ordenes: rutasConOrden.map(r => ({ id: r.id, orden: r.orden })) }),
        });
        showToast("Orden de rutas guardado", "success");
      } catch {
        showToast("Error al guardar orden", "error");
      }
    },
  });

  const clientesDeRuta = rutaSeleccionada
    ? clientes
        .filter(c => c.rutaId === rutaSeleccionada.id)
        .sort((a, b) => (a.ordenVisita || 0) - (b.ordenVisita || 0))
    : [];

  const {
    containerHandlers: containerHandlersCliente,
    handleHandlers: handleHandlersCliente,
  } = useDragSort({
    items: clientesDeRuta,
    onReorder: async (nuevosClientes) => {
      const conOrden = nuevosClientes.map((c, i) => ({ ...c, ordenVisita: i + 1 }));
      setClientes(prev => {
        const sinRuta = prev.filter(c => c.rutaId !== rutaSeleccionada.id);
        return [...sinRuta, ...conOrden];
      });
      try {
        await fetch(`${API_URL}/api/clientes/ordenar`, {
          method: "PUT", headers,
          body: JSON.stringify({ ordenes: conOrden.map(c => ({ id: c.id, ordenVisita: c.ordenVisita })) }),
        });
        showToast("Orden guardado", "success");
      } catch {
        showToast("Error al guardar orden", "error");
      }
    },
  });

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

  useEffect(() => {
    document.body.style.overflow = panelVisible ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [panelVisible]);

  const crearRuta = async () => {
    if (!form.nombre) return showToast("El nombre es obligatorio", "error");
    setCreando(true);
    try {
      const res = await fetch(`${API_URL}/api/rutas`, {
        method: "POST", headers,
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

  const abrirPanelEdicion = (ruta, e) => {
    e.stopPropagation();
    setRutaEditando(ruta);
    setDiaCobroEdit(ruta.diaCobro || "lunes");
    setPanelVisible(true);
  };

  const cerrarPanel = () => {
    setPanelVisible(false);
    setTimeout(() => setRutaEditando(null), 300);
  };

  const guardarDiaCobro = async () => {
    if (!rutaEditando) return;
    setGuardandoDia(true);
    try {
      const res = await fetch(`${API_URL}/api/rutas/${rutaEditando.id}`, {
        method: "PUT", headers,
        body: JSON.stringify({ diaCobro: diaCobroEdit }),
      });
      if (res.ok) {
        showToast(`Día actualizado a ${DIAS_LABELS[diaCobroEdit]}`, "success");
        cerrarPanel();
        cargarDatos();
      } else {
        showToast("Error al actualizar", "error");
      }
    } catch {
      showToast("Error al actualizar", "error");
    } finally {
      setGuardandoDia(false);
    }
  };

  const iniciarEdicionPrioridad = () => {
    const p = {};
    rutas.forEach((r, i) => { p[r.id] = r.orden || i + 1; });
    setPrioridades(p);
    setEditandoPrioridad(true);
  };

  const guardarPorPrioridad = async () => {
    const rutasOrdenadas = [...rutas].sort((a, b) =>
      (prioridades[a.id] || 0) - (prioridades[b.id] || 0)
    );
    const rutasConOrden = rutasOrdenadas.map((r, i) => ({ ...r, orden: i + 1 }));
    setRutas(rutasConOrden);
    setEditandoPrioridad(false);
    try {
      await fetch(`${API_URL}/api/clientes/ordenar-rutas`, {
        method: "PUT", headers,
        body: JSON.stringify({ ordenes: rutasConOrden.map(r => ({ id: r.id, orden: r.orden })) }),
      });
      showToast("Orden por prioridad guardado", "success");
    } catch {
      showToast("Error al guardar", "error");
    }
  };

  return (
    <div className="pt-16 text-[var(--text)]">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Map size={24} style={{ color: "var(--primary)" }} />
            Gestión de Rutas
          </h1>
          <p className="text-sm opacity-60 mt-1">Organiza y ordena tus zonas de cobro</p>
        </div>
        <button
          onClick={() => setMostrarForm(!mostrarForm)}
          className="flex items-center gap-2 text-white px-4 py-2 rounded-lg shadow hover:opacity-90 transition"
          style={{ backgroundColor: mostrarForm ? "#6b7280" : "var(--primary)" }}
        >
          {mostrarForm ? <><X size={16} /> Cancelar</> : <><Plus size={16} /> Nueva Ruta</>}
        </button>
      </div>

      {/* FORMULARIO */}
      {mostrarForm && (
        <div className="rounded-2xl p-5 mb-6 shadow"
          style={{ backgroundColor: "var(--card)", border: "1px solid var(--card-border)" }}>
          <h2 className="font-bold mb-4">Nueva Ruta / Zona</h2>
          <div className="space-y-3">
            <input placeholder="Nombre (ej: El Chal - Casco Urbano)"
              value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              className="w-full p-2 rounded"
              style={{ backgroundColor: "var(--bg)", color: "var(--text)", border: "1px solid var(--card-border)" }} />
            <input placeholder="Descripción (opcional)"
              value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
              className="w-full p-2 rounded"
              style={{ backgroundColor: "var(--bg)", color: "var(--text)", border: "1px solid var(--card-border)" }} />
            <select value={form.diaCobro} onChange={(e) => setForm({ ...form, diaCobro: e.target.value })}
              className="w-full p-2 rounded"
              style={{ backgroundColor: "var(--bg)", color: "var(--text)", border: "1px solid var(--card-border)" }}>
              {DIAS.map((d) => <option key={d} value={d}>{DIAS_LABELS[d]}</option>)}
            </select>
            <button onClick={crearRuta} disabled={creando}
              className="flex items-center justify-center gap-2 w-full py-2 rounded-lg font-semibold text-white hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: "var(--primary)" }}>
              <Plus size={16} />{creando ? "Creando..." : "Crear Ruta"}
            </button>
          </div>
        </div>
      )}

      {loading && <p className="opacity-60">Cargando...</p>}

      {!loading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* ── COLUMNA RUTAS ── */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h2 className="flex items-center gap-2 font-bold text-lg">
                <ClipboardList size={18} /> Orden de visita de zonas
              </h2>
              {!editandoPrioridad ? (
                <button onClick={iniciarEdicionPrioridad}
                  className="flex items-center gap-1 text-xs px-3 py-1 rounded-lg font-semibold text-white hover:opacity-90"
                  style={{ backgroundColor: "var(--secondary)" }}>
                  <ListOrdered size={13} /> Ordenar por número
                </button>
              ) : (
                <div className="flex gap-2">
                  <button onClick={guardarPorPrioridad}
                    className="flex items-center gap-1 text-xs px-3 py-1 rounded-lg font-semibold text-white bg-green-500 hover:opacity-90">
                    <Check size={13} /> Aplicar
                  </button>
                  <button onClick={() => setEditandoPrioridad(false)}
                    className="flex items-center gap-1 text-xs px-3 py-1 rounded-lg font-semibold text-white bg-red-400 hover:opacity-90">
                    <X size={13} /> Cancelar
                  </button>
                </div>
              )}
            </div>
            <p className="text-sm opacity-60 mb-4">
              {editandoPrioridad
                ? "Asigna un número a cada zona y presiona Aplicar"
                : "Toca ⠿ para arrastrar · toca el lápiz para editar el día"}
            </p>

            {rutas.length === 0 && (
              <div className="rounded-2xl p-8 text-center"
                style={{ backgroundColor: "var(--card)", border: "1px solid var(--card-border)" }}>
                <div className="flex justify-center mb-2"><Map size={32} className="opacity-30" /></div>
                <p className="font-semibold">No hay rutas creadas</p>
              </div>
            )}

            <div className="space-y-2">
              {rutas.map((ruta, index) => {
                const clientesEnRuta = clientes.filter(c => c.rutaId === ruta.id);
                const cHandlers = editandoPrioridad ? {} : containerHandlersRuta(index);
                const hHandlers = editandoPrioridad ? {} : handleHandlersRuta(index);
                return (
                  <div key={ruta.id}
                    // ✅ Card: solo containerHandlers (sin touchAction:none)
                    {...cHandlers}
                    onClick={() => !editandoPrioridad && setRutaSeleccionada(
                      rutaSeleccionada?.id === ruta.id ? null : ruta
                    )}
                    className="rounded-2xl p-4 cursor-pointer hover:scale-[1.01] shadow-md select-none"
                    style={{
                      ...cHandlers.style,
                      backgroundColor: "var(--card)",
                      border: rutaSeleccionada?.id === ruta.id
                        ? "2px solid var(--primary)"
                        : "2px solid transparent",
                    }}>
                    <div className="flex items-center gap-3">
                      {editandoPrioridad ? (
                        <input type="number" min="1"
                          value={prioridades[ruta.id] || ""}
                          onChange={(e) => setPrioridades({ ...prioridades, [ruta.id]: Number(e.target.value) })}
                          onClick={(e) => e.stopPropagation()}
                          className="w-12 text-center p-1 rounded font-bold text-sm"
                          style={{ backgroundColor: "var(--bg)", color: "var(--text)", border: "2px solid var(--primary)" }} />
                      ) : (
                        // ✅ GripVertical: solo handleHandlers (con touchAction:none y cursor grab)
                        <div
                          {...hHandlers}
                          onClick={(e) => e.stopPropagation()}
                          className="p-1 rounded opacity-40 hover:opacity-80 active:opacity-100 shrink-0"
                          style={{ ...hHandlers.style, touchAction: "none" }}
                        >
                          <GripVertical size={18} />
                        </div>
                      )}

                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                        style={{ backgroundColor: "var(--primary)" }}>
                        {ruta.orden || index + 1}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-bold truncate">{ruta.nombre}</p>
                        <p className="flex items-center gap-1 text-xs opacity-50 mt-0.5">
                          <CalendarDays size={11} />
                          {DIAS_LABELS[ruta.diaCobro] || ruta.diaCobro || "—"}
                        </p>
                        {ruta.descripcion && <p className="text-xs opacity-60 truncate">{ruta.descripcion}</p>}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full text-white"
                          style={{ backgroundColor: "var(--secondary)" }}>
                          <Users size={11} />{clientesEnRuta.length}
                        </span>
                        {!editandoPrioridad && (
                          <>
                            <button onClick={(e) => abrirPanelEdicion(ruta, e)}
                              title="Editar día de cobro"
                              className="w-7 h-7 flex items-center justify-center rounded-lg transition hover:opacity-80"
                              style={{ backgroundColor: "var(--bg)", color: "var(--secondary)", border: "1px solid var(--card-border)" }}>
                              <Pencil size={13} />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); eliminarRuta(ruta.id); }}
                              title="Eliminar ruta"
                              className="w-7 h-7 flex items-center justify-center rounded-lg text-red-400 hover:text-red-600 transition"
                              style={{ backgroundColor: "var(--bg)", border: "1px solid var(--card-border)" }}>
                              <X size={13} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── COLUMNA CLIENTES ── */}
          <div>
            <h2 className="flex items-center gap-2 font-bold mb-3 text-lg">
              <Users size={18} />
              {rutaSeleccionada ? `Clientes — ${rutaSeleccionada.nombre}` : "Selecciona una ruta"}
            </h2>
            <p className="text-sm opacity-60 mb-4">
              {rutaSeleccionada
                ? "Toca ⠿ para cambiar el orden de visita"
                : "Haz clic en una ruta para ver sus clientes"}
            </p>

            {!rutaSeleccionada && (
              <div className="rounded-2xl p-8 text-center"
                style={{ backgroundColor: "var(--card)", border: "1px solid var(--card-border)" }}>
                <div className="flex justify-center mb-2"><MousePointerClick size={32} className="opacity-30" /></div>
                <p className="font-semibold">Selecciona una ruta</p>
                <p className="text-sm opacity-60 mt-1">para ver y ordenar sus clientes</p>
              </div>
            )}

            {rutaSeleccionada && clientesDeRuta.length === 0 && (
              <div className="rounded-2xl p-8 text-center"
                style={{ backgroundColor: "var(--card)", border: "1px solid var(--card-border)" }}>
                <div className="flex justify-center mb-2"><UserX size={32} className="opacity-30" /></div>
                <p className="font-semibold">Sin clientes asignados</p>
                <p className="text-sm opacity-60 mt-1">Edita un cliente y asígnale esta ruta</p>
              </div>
            )}

            {rutaSeleccionada && clientesDeRuta.length > 0 && (
              <div className="space-y-2">
                {clientesDeRuta.map((cliente, index) => {
                  const cHandlers = containerHandlersCliente(index);
                  const hHandlers = handleHandlersCliente(index);
                  return (
                    <div key={cliente.id}
                      // ✅ Card: solo containerHandlers
                      {...cHandlers}
                      className="rounded-2xl p-4 shadow-md select-none hover:scale-[1.01]"
                      style={{
                        ...cHandlers.style,
                        backgroundColor: "var(--card)",
                        border: "1px solid var(--card-border)",
                      }}>
                      <div className="flex items-center gap-3">
                        {/* ✅ GripVertical: solo handleHandlers */}
                        <div
                          {...hHandlers}
                          onClick={(e) => e.stopPropagation()}
                          className="p-1 rounded opacity-40 hover:opacity-80 active:opacity-100 shrink-0"
                          style={{ ...hHandlers.style, touchAction: "none" }}
                        >
                          <GripVertical size={18} />
                        </div>
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                          style={{ backgroundColor: "var(--primary)" }}>
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <p className="font-bold">{cliente.nombres} {cliente.apellidos}</p>
                          <p className="flex items-center gap-1 text-xs opacity-60">
                            <MapPin size={11} />{cliente.zona || cliente.direccion}
                          </p>
                          <p className="flex items-center gap-1 text-xs opacity-60">
                            <Phone size={11} />{cliente.telefono}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* BACKDROP */}
      <div onClick={cerrarPanel}
        className="fixed inset-0 z-[130] transition-all duration-300"
        style={{
          backgroundColor: "rgba(0,0,0,0.4)",
          backdropFilter: panelVisible ? "blur(2px)" : "blur(0px)",
          opacity: panelVisible ? 1 : 0,
          pointerEvents: panelVisible ? "auto" : "none",
        }}
      />

      {/* PANEL LATERAL */}
      <div className="fixed top-0 right-0 h-full w-80 z-[140] shadow-2xl flex flex-col"
        style={{
          backgroundColor: "var(--card)",
          borderLeft: "1px solid var(--card-border)",
          transform: panelVisible ? "translateX(0)" : "translateX(100%)",
          transition: panelVisible
            ? "transform 0.38s cubic-bezier(0.34, 1.4, 0.64, 1)"
            : "transform 0.25s cubic-bezier(0.4, 0, 1, 1)",
        }}>
        <div className="flex items-center justify-between px-6 py-5 border-b"
          style={{ borderColor: "var(--card-border)" }}>
          <div>
            <p className="font-bold text-base" style={{ color: "var(--text)" }}>Editar día de cobro</p>
            {rutaEditando && (
              <p className="text-xs opacity-50 mt-0.5 truncate max-w-[180px]">{rutaEditando.nombre}</p>
            )}
          </div>
          <button onClick={cerrarPanel}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:opacity-70 transition"
            style={{ backgroundColor: "var(--bg)", color: "var(--text)" }}>
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 px-6 py-6">
          <label className="flex items-center gap-2 text-sm font-semibold mb-4"
            style={{ color: "var(--text)" }}>
            <CalendarDays size={15} style={{ color: "var(--primary)" }} />
            Selecciona el día
          </label>
          <div className="grid grid-cols-2 gap-2">
            {DIAS.map((d) => (
              <button key={d} onClick={() => setDiaCobroEdit(d)}
                className="py-3 rounded-xl text-sm font-semibold transition-all duration-150 active:scale-95"
                style={{
                  backgroundColor: diaCobroEdit === d ? "var(--primary)" : "var(--bg)",
                  color: diaCobroEdit === d ? "white" : "var(--text)",
                  border: diaCobroEdit === d ? "2px solid var(--primary)" : "2px solid var(--card-border)",
                }}>
                {DIAS_LABELS[d]}
              </button>
            ))}
          </div>
        </div>

        <div className="px-6 pb-6 pt-2 border-t flex flex-col gap-2"
          style={{ borderColor: "var(--card-border)" }}>
          <button onClick={guardarDiaCobro} disabled={guardandoDia}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-white hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: "var(--primary)" }}>
            <Check size={16} />{guardandoDia ? "Guardando..." : "Guardar cambios"}
          </button>
          <button onClick={cerrarPanel}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold hover:opacity-70"
            style={{ backgroundColor: "var(--bg)", color: "var(--text)", border: "1px solid var(--card-border)" }}>
            <X size={16} /> Cancelar
          </button>
        </div>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={closeToast} />}
    </div>
  );
}