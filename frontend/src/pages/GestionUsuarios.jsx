import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Toast from "../components/Toast";
import useToast from "../hooks/useToast";
import { API_URL, authFetch } from "../services/api";

const ROUTES = {
  USERS: `${API_URL}/api/users`,
};

const ROLE_COLORS = {
  admin: "bg-purple-100 text-purple-700",
  trabajador: "bg-blue-100 text-blue-700",
};

export default function GestionUsuarios() {
  const user = JSON.parse(localStorage.getItem("user"));
  const navigate = useNavigate();
  const { toast, showToast, closeToast } = useToast();

  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedUsuario, setSelectedUsuario] = useState(null);

  const fetchUsuarios = async () => {
    try {
      const res = await authFetch(ROUTES.USERS);
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Error cargando usuarios");
        return;
      }
      setUsuarios(data);
    } catch (err) {
      console.error(err);
      setError("No se pudo conectar con el servidor");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsuarios();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("¿Seguro que deseas dar de baja este usuario?")) return;
    try {
      const res = await authFetch(`${ROUTES.USERS}/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.message || "No se pudo eliminar", "error");
        return;
      }
      setSelectedUsuario(null);
      fetchUsuarios();
      showToast("Usuario dado de baja correctamente", "success");
    } catch (err) {
      console.error(err);
      showToast("Error eliminando usuario", "error");
    }
  };

  const getInitials = (name) => {
    if (!name) return "?";
    const parts = name.split(" ");
    return parts.length >= 2
      ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
      : name.charAt(0).toUpperCase();
  };

  const filtrados = usuarios.filter((u) => {
    const term = search.toLowerCase();
    return (
      u.name?.toLowerCase().includes(term) ||
      u.username?.toLowerCase().includes(term) ||
      u.email?.toLowerCase().includes(term)
    );
  });

  return (
    <>
      <div className="min-w-0 text-[var(--text)]">
        {/* HEADER */}
        <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="break-words text-xl font-bold sm:text-2xl">Gestión de Usuarios</h1>
          <button
            onClick={() => navigate("/usuarios/crear")}
            className="w-full rounded-lg px-4 py-2 text-white shadow transition hover:opacity-90 sm:w-auto sm:hover:scale-105"
            style={{ backgroundColor: "var(--primary)" }}
          >
            + Crear Usuario
          </button>
        </div>

        {/* BUSCADOR */}
        <div className="mb-4 sm:mb-6">
          <input
            type="text"
            placeholder="Buscar por nombre, username o email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full min-w-0 rounded-lg px-3 py-2 focus:outline-none sm:px-4"
            style={{
              backgroundColor: "var(--card)",
              color: "var(--text)",
              border: "1px solid var(--card-border)",
            }}
          />
        </div>

        {loading && <p>Cargando usuarios...</p>}
        {error && <p className="text-red-500">{error}</p>}
        {!loading && filtrados.length === 0 && <p>No se encontraron usuarios.</p>}

        {/* GRID */}
        {!loading && filtrados.length > 0 && (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {filtrados.map((u) => (
              <div
                key={u.id}
                onClick={() => setSelectedUsuario(u)}
                className="min-w-0 cursor-pointer rounded-2xl p-4 shadow-md transition-all duration-200 hover:shadow-xl md:hover:scale-[1.02] sm:p-5"
                style={{
                  backgroundColor: "var(--card)",
                  border: u.id === user?.id
                    ? "2px solid var(--primary)"
                    : "2px solid transparent",
                }}
              >
                <div className="mb-3 flex min-w-0 items-center gap-3 sm:mb-4 sm:gap-4">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-base font-bold text-white sm:h-12 sm:w-12 sm:text-lg"
                    style={{ backgroundColor: "var(--secondary)" }}
                  >
                    {getInitials(u.name)}
                  </div>
                  <div className="min-w-0">
                    <h2 className="break-words text-base font-bold leading-tight">{u.name}</h2>
                    <p className="break-all text-xs opacity-50">@{u.username}</p>
                  </div>
                </div>
                <div className="space-y-1 text-sm" style={{ color: "var(--text-muted)" }}>
                  <p className="break-all">
                    <span className="font-medium" style={{ color: "var(--text)" }}>Email:</span>{" "}
                    {u.email}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`text-xs px-2 py-1 rounded-full font-semibold ${ROLE_COLORS[u.role] || "bg-gray-100 text-gray-600"}`}>
                      {u.role}
                    </span>
                    {u.id === user?.id && (
                      <span className="text-xs px-2 py-1 rounded-full font-semibold bg-green-100 text-green-700">
                        Tú
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* MODAL */}
        {selectedUsuario && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-2 backdrop-blur-sm sm:p-4"
            onClick={() => setSelectedUsuario(null)}
          >
            <div
              className="max-h-[calc(100dvh-1rem)] w-full max-w-sm overflow-y-auto rounded-2xl p-4 shadow-2xl sm:max-h-[calc(100dvh-2rem)] sm:rounded-3xl sm:p-8"
              onClick={(e) => e.stopPropagation()}
              style={{
                backgroundColor: "var(--card)",
                animation: "zoomIn 0.2s ease-out",
              }}
            >
              <div className="mb-4 flex min-w-0 flex-col items-center sm:mb-6">
                <div
                  className="mb-3 flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-2xl font-bold text-white sm:h-20 sm:w-20 sm:text-3xl"
                  style={{ backgroundColor: "var(--secondary)" }}
                >
                  {getInitials(selectedUsuario.name)}
                </div>
                <h2 className="max-w-full break-words text-center text-xl font-bold">{selectedUsuario.name}</h2>
                <p className="max-w-full break-all text-sm opacity-50">@{selectedUsuario.username}</p>
                <span className={`mt-2 text-xs px-3 py-1 rounded-full font-semibold ${ROLE_COLORS[selectedUsuario.role] || "bg-gray-100 text-gray-600"}`}>
                  {selectedUsuario.role}
                </span>
              </div>

              <div className="mb-4 min-w-0 space-y-2 rounded-xl p-3 text-sm sm:mb-6 sm:p-4" style={{ backgroundColor: "var(--bg)" }}>
                <p className="break-all"><span className="font-semibold">Email:</span> {selectedUsuario.email}</p>
                <p className="break-all"><span className="font-semibold">Username:</span> @{selectedUsuario.username}</p>
                <p>
                  <span className="font-semibold">Miembro desde:</span>{" "}
                  {new Date(selectedUsuario.createdAt).toLocaleDateString("es-GT")}
                </p>
              </div>

              <div className="flex flex-col gap-2">
                {selectedUsuario.id !== user?.id ? (
                  <button
                    onClick={() => handleDelete(selectedUsuario.id)}
                    className="w-full py-2 bg-red-500 text-white rounded-xl font-semibold hover:opacity-90"
                  >
                    Dar de Baja
                  </button>
                ) : (
                  <div
                    className="w-full py-2 text-center rounded-xl text-sm opacity-60"
                    style={{
                      backgroundColor: "var(--bg)",
                      border: "1px solid var(--card-border)",
                    }}
                  >
                    No puedes darte de baja a ti mismo
                  </div>
                )}
                <button
                  onClick={() => setSelectedUsuario(null)}
                  className="w-full py-2 bg-gray-300 text-gray-800 rounded-xl font-semibold hover:opacity-90"
                >
                  Cerrar
                </button>
              </div>
            </div>

            <style>{`
              @keyframes zoomIn {
                from { opacity: 0; transform: scale(0.85); }
                to   { opacity: 1; transform: scale(1); }
              }
            `}</style>
          </div>
        )}
      </div>

      {/* 👇 FUERA de todo */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={closeToast} />}
    </>
  );
}
