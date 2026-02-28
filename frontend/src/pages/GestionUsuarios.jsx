import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Toast from "../components/Toast";
import useToast from "../hooks/useToast";

const ROUTES = {
  USERS: "http://localhost:3333/api/users",
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
      const token = localStorage.getItem("token");
      const res = await fetch(ROUTES.USERS, {
        headers: { Authorization: `Bearer ${token}` },
      });
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
      const token = localStorage.getItem("token");
      const res = await fetch(`${ROUTES.USERS}/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
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
      <div className="pt-16 text-[var(--text)]">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
          <h1 className="text-2xl font-bold">Gestión de Usuarios</h1>
          <button
            onClick={() => navigate("/usuarios/crear")}
            className="text-white px-4 py-2 rounded-lg shadow hover:opacity-90 hover:scale-105 transition"
            style={{ backgroundColor: "var(--primary)" }}
          >
            + Crear Usuario
          </button>
        </div>

        {/* BUSCADOR */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Buscar por nombre, username o email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-2 rounded-lg focus:outline-none"
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtrados.map((u) => (
              <div
                key={u.id}
                onClick={() => setSelectedUsuario(u)}
                className="rounded-2xl shadow-md p-5 cursor-pointer hover:scale-105 hover:shadow-xl transition-all duration-200"
                style={{
                  backgroundColor: "var(--card)",
                  border: u.id === user?.id
                    ? "2px solid var(--primary)"
                    : "2px solid transparent",
                }}
              >
                <div className="flex items-center gap-4 mb-4">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0"
                    style={{ backgroundColor: "var(--secondary)" }}
                  >
                    {getInitials(u.name)}
                  </div>
                  <div>
                    <h2 className="font-bold text-base leading-tight">{u.name}</h2>
                    <p className="text-xs opacity-50">@{u.username}</p>
                  </div>
                </div>
                <div className="space-y-1 text-sm" style={{ color: "var(--text-muted)" }}>
                  <p>
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
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={() => setSelectedUsuario(null)}
          >
            <div
              className="rounded-3xl shadow-2xl p-8 w-full max-w-sm mx-4"
              onClick={(e) => e.stopPropagation()}
              style={{
                backgroundColor: "var(--card)",
                animation: "zoomIn 0.2s ease-out",
              }}
            >
              <div className="flex flex-col items-center mb-6">
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center text-white font-bold text-3xl mb-3"
                  style={{ backgroundColor: "var(--secondary)" }}
                >
                  {getInitials(selectedUsuario.name)}
                </div>
                <h2 className="text-xl font-bold text-center">{selectedUsuario.name}</h2>
                <p className="text-sm opacity-50">@{selectedUsuario.username}</p>
                <span className={`mt-2 text-xs px-3 py-1 rounded-full font-semibold ${ROLE_COLORS[selectedUsuario.role] || "bg-gray-100 text-gray-600"}`}>
                  {selectedUsuario.role}
                </span>
              </div>

              <div className="space-y-2 text-sm mb-6 rounded-xl p-4" style={{ backgroundColor: "var(--bg)" }}>
                <p><span className="font-semibold">Email:</span> {selectedUsuario.email}</p>
                <p><span className="font-semibold">Username:</span> @{selectedUsuario.username}</p>
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