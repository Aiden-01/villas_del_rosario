import { useCallback, useEffect, useState } from "react";
import useToast from "../hooks/useToast";
import Toast from "../components/Toast";
import { authFetch } from "../services/api";
import {
  ClipboardList, RefreshCw, Plus, Pencil, X,
  HandCoins, KeyRound, User, DollarSign,
  Users, Pin, Inbox, Calendar, Clock
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3333";

const TIPO_CONFIG = {
  crear:      { color: "#16a34a", bg: "#dcfce7", icon: Plus,      label: "Creado" },
  actualizar: { color: "#2563eb", bg: "#dbeafe", icon: Pencil,    label: "Actualizado" },
  eliminar:   { color: "#dc2626", bg: "#fee2e2", icon: X,         label: "Eliminado" },
  pago:       { color: "#7c3aed", bg: "#ede9fe", icon: HandCoins, label: "Pago" },
  login:      { color: "#d97706", bg: "#fef3c7", icon: KeyRound,  label: "Login" },
};

const ENTIDAD_CONFIG = {
  cliente:  { icon: User,       label: "Cliente" },
  prestamo: { icon: DollarSign, label: "Venta" },
  pago:     { icon: HandCoins,  label: "Pago" },
  usuario:  { icon: Users,      label: "Usuario" },
};

const FILTROS_TIPO = ["todos", "crear", "actualizar", "eliminar", "pago"];
const FILTROS_ENTIDAD = ["todos", "cliente", "prestamo", "pago", "usuario"];

export default function Historial() {
  const [actividades, setActividades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [filtroEntidad, setFiltroEntidad] = useState("todos");
  const [busqueda, setBusqueda] = useState("");
  const { toast, closeToast } = useToast();

  const cargarHistorial = useCallback(async () => {
    setLoading(true);
    try {
      let url = `${API_URL}/api/historial?limit=100`;
      if (filtroTipo !== "todos") url += `&tipo=${filtroTipo}`;
      if (filtroEntidad !== "todos") url += `&entidad=${filtroEntidad}`;

      const res = await authFetch(url);
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Error al cargar historial");
        return;
      }

      setActividades(Array.isArray(data) ? data : []);
    } catch {
      setError("No se pudo conectar con el servidor");
    } finally {
      setLoading(false);
    }
  }, [filtroEntidad, filtroTipo]);

  useEffect(() => {
    cargarHistorial();
  }, [cargarHistorial]);

  const actividadesFiltradas = actividades.filter(
    (actividad) =>
      busqueda === "" ||
      actividad.descripcion.toLowerCase().includes(busqueda.toLowerCase())
  );

  const formatearFecha = (fecha) => {
    if (!fecha) return "";
    const d = new Date(fecha);
    return d.toLocaleDateString("es-GT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const agruparPorFecha = (items) =>
    items.reduce((grupos, item) => {
      const fecha = new Date(item.createdAt).toLocaleDateString("es-GT", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
      if (!grupos[fecha]) grupos[fecha] = [];
      grupos[fecha].push(item);
      return grupos;
    }, {});

  return (
    <div className="pt-16 text-[var(--text)]">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <ClipboardList size={24} style={{ color: "var(--primary)" }} />
            Historial de Actividad
          </h1>
          <p className="text-sm opacity-60 mt-1">Registro de todas las acciones del sistema</p>
        </div>
        <button
          onClick={cargarHistorial}
          className="flex items-center gap-2 text-white px-4 py-2 rounded-lg shadow hover:opacity-90 transition"
          style={{ backgroundColor: "var(--primary)" }}
        >
          <RefreshCw size={16} />
          Actualizar
        </button>
      </div>

      <div
        className="rounded-2xl p-4 mb-6 shadow"
        style={{ backgroundColor: "var(--card)", border: "1px solid var(--card-border)" }}
      >
        <div className="flex flex-col gap-3">
          <input
            type="text"
            placeholder="Buscar en el historial..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full p-2 rounded-lg outline-none"
            style={{
              backgroundColor: "var(--bg)",
              color: "var(--text)",
              border: "1px solid var(--card-border)",
            }}
          />

          <div>
            <p className="text-xs font-semibold opacity-60 mb-2">Tipo de acción:</p>
            <div className="flex flex-wrap gap-2">
              {FILTROS_TIPO.map((tipo) => {
                const conf = TIPO_CONFIG[tipo];
                const Icon = conf?.icon;
                return (
                  <button
                    key={tipo}
                    onClick={() => setFiltroTipo(tipo)}
                    className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold transition"
                    style={{
                      backgroundColor: filtroTipo === tipo ? "var(--primary)" : "var(--bg)",
                      color: filtroTipo === tipo ? "white" : "var(--text)",
                      border: "1px solid var(--card-border)",
                    }}
                  >
                    {Icon && <Icon size={11} />}
                    {tipo === "todos" ? "Todos" : conf?.label || tipo}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold opacity-60 mb-2">Categoría:</p>
            <div className="flex flex-wrap gap-2">
              {FILTROS_ENTIDAD.map((entidad) => {
                const conf = ENTIDAD_CONFIG[entidad];
                const Icon = conf?.icon;
                return (
                  <button
                    key={entidad}
                    onClick={() => setFiltroEntidad(entidad)}
                    className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold transition"
                    style={{
                      backgroundColor: filtroEntidad === entidad ? "var(--secondary)" : "var(--bg)",
                      color: filtroEntidad === entidad ? "white" : "var(--text)",
                      border: "1px solid var(--card-border)",
                    }}
                  >
                    {Icon && <Icon size={11} />}
                    {entidad === "todos" ? "Todas" : conf?.label || entidad}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {!loading && (
        <p className="text-sm opacity-60 mb-4">
          {actividadesFiltradas.length} actividad
          {actividadesFiltradas.length !== 1 ? "es" : ""} encontrada
          {actividadesFiltradas.length !== 1 ? "s" : ""}
        </p>
      )}

      {loading && <p className="opacity-60">Cargando historial...</p>}
      {error && <p className="text-red-500">{error}</p>}

      {!loading && actividadesFiltradas.length === 0 && (
        <div
          className="rounded-2xl p-10 text-center shadow"
          style={{ backgroundColor: "var(--card)", border: "1px solid var(--card-border)" }}
        >
          <div className="flex justify-center mb-3">
            <Inbox size={40} className="opacity-30" />
          </div>
          <p className="font-semibold">No hay actividad registrada</p>
          <p className="text-sm opacity-60 mt-1">Las acciones del sistema aparecerán aquí</p>
        </div>
      )}

      {!loading && actividadesFiltradas.length > 0 && (
        <div className="space-y-6">
          {Object.entries(agruparPorFecha(actividadesFiltradas)).map(([fecha, items]) => (
            <div key={fecha}>
              <div className="flex items-center gap-3 mb-3">
                <div className="h-px flex-1" style={{ backgroundColor: "var(--card-border)" }} />
                <span
                  className="flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full capitalize"
                  style={{
                    backgroundColor: "var(--card)",
                    border: "1px solid var(--card-border)",
                    color: "var(--text)",
                  }}
                >
                  <Calendar size={11} />
                  {fecha}
                </span>
                <div className="h-px flex-1" style={{ backgroundColor: "var(--card-border)" }} />
              </div>

              <div className="space-y-2">
                {items.map((actividad) => {
                  const tipoConf = TIPO_CONFIG[actividad.tipo] || TIPO_CONFIG.crear;
                  const entidadConf = ENTIDAD_CONFIG[actividad.entidad] || {
                    icon: Pin,
                    label: actividad.entidad,
                  };
                  const TipoIcon = tipoConf.icon;
                  const EntidadIcon = entidadConf.icon;

                  return (
                    <div
                      key={actividad.id}
                      className="rounded-2xl p-4 shadow-sm flex items-start gap-4"
                      style={{
                        backgroundColor: "var(--card)",
                        border: "1px solid var(--card-border)",
                      }}
                    >
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                        style={{ backgroundColor: tipoConf.bg, color: tipoConf.color }}
                      >
                        <TipoIcon size={16} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span
                            className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold"
                            style={{ backgroundColor: tipoConf.bg, color: tipoConf.color }}
                          >
                            <TipoIcon size={10} />
                            {tipoConf.label}
                          </span>
                          <span className="flex items-center gap-1 text-xs opacity-60">
                            <EntidadIcon size={11} />
                            {entidadConf.label}
                          </span>
                          {actividad.usuario && (
                            <span className="flex items-center gap-1 text-xs opacity-60">
                              <User size={11} />
                              @{actividad.usuario.username}
                            </span>
                          )}
                        </div>

                        <p className="text-sm font-medium">{actividad.descripcion}</p>

                        <p className="flex items-center gap-1 text-xs opacity-40 mt-1">
                          <Clock size={10} />
                          {formatearFecha(actividad.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={closeToast} />}
    </div>
  );
}
