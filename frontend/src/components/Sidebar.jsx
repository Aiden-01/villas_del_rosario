import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { User, Moon, Sun } from "lucide-react";

export default function Sidebar({ menuOpen, setMenuOpen, role }) {
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const user = JSON.parse(localStorage.getItem("user"));

  const isAdmin = role === "admin";
  const isWorker = role === "worker";

  const [dark, setDark] = useState(localStorage.getItem("theme") === "dark");

  useEffect(() => {
    const html = document.documentElement;
    if (dark) {
      html.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      html.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [dark]);

  const toggleDark = () => setDark(!dark);

  const handleNavigate = (path) => {
    navigate(path);
    setMenuOpen(false);
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/";
  };

  return (
    <>
      {/* PERFIL + DARKMODE ARRIBA A LA DERECHA */}
      <div className="fixed top-4 right-4 z-[120] flex items-center gap-3">

        {/* TOGGLE DARKMODE */}
        <button
          onClick={toggleDark}
          className="relative w-14 h-8 flex items-center rounded-full px-1 transition-all duration-300 shadow-lg"
          style={{ backgroundColor: "var(--secondary)" }}
        >
          <div
            className={`absolute w-6 h-6 rounded-full shadow-md transform transition-transform duration-300 flex items-center justify-center bg-white ${
              dark ? "translate-x-6" : "translate-x-0"
            }`}
          >
            {dark ? (
              <Moon size={14} className="text-slate-700" />
            ) : (
              <Sun size={14} className="text-yellow-500" />
            )}
          </div>
        </button>

        {/* PERFIL */}
        <div className="relative">
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2 shadow-lg px-3 py-2 rounded-full hover:scale-105 transition"
            style={{
              backgroundColor: "var(--card)",
              color: "var(--text)",
              border: "1px solid var(--card-border)",
            }}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white"
              style={{ backgroundColor: "var(--primary)" }}
            >
              <User size={16} />
            </div>
            <span className="text-sm font-semibold">{user?.username}</span>
          </button>

          {/* DROPDOWN */}
          {profileOpen && (
            <div
              className="absolute right-0 top-12 w-40 rounded-xl shadow-xl overflow-hidden"
              style={{
                backgroundColor: "var(--card)",
                border: "1px solid var(--card-border)",
              }}
            >
              <button
                onClick={logout}
                className="w-full text-left px-4 py-2 text-red-500 hover:opacity-80 transition"
              >
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>

      {/* SIDEBAR */}
      <div
        className={`fixed top-0 left-0 h-full w-64 text-white transform transition-transform duration-300 ${
          menuOpen ? "translate-x-0" : "-translate-x-full"
        } z-[100] shadow-2xl`}
        style={{ backgroundColor: "var(--secondary)" }}
      >
        <div className="pt-16 px-6 pb-6">
          <h2 className="text-2xl font-bold mb-6">Menú</h2>

          <ul className="space-y-2">
            <li
              className="cursor-pointer p-2 rounded transition hover:bg-white/20"
              onClick={() => handleNavigate("/dashboard")}
            >
              Inicio
            </li>
            <li
              className="cursor-pointer p-2 rounded transition hover:bg-white/20"
              onClick={() => handleNavigate("/clientes")}
            >
              Clientes
            </li>
            <li
              className="cursor-pointer p-2 rounded transition hover:bg-white/20"
              onClick={() => handleNavigate("/prestamos")}
            >
              Préstamos
            </li>
            <li
              className="cursor-pointer p-2 rounded transition hover:bg-white/20 font-semibold"
              onClick={() => handleNavigate("/ruta-del-dia")}
            >
              📍 Ruta de Hoy
            </li>

            {isAdmin && (
              <>
                <li
                  className="cursor-pointer p-2 rounded transition hover:bg-white/20"
                  onClick={() => handleNavigate("/rutas")}
                >
                  🗺️ Rutas
                </li>
                <li
                  className="cursor-pointer p-2 rounded transition hover:bg-white/20"
                  onClick={() => handleNavigate("/usuarios")}
                >
                  Usuarios
                </li>
                <li
                  className="cursor-pointer p-2 rounded transition hover:bg-white/20"
                  onClick={() => handleNavigate("/reportes")}
                >
                  Reportes
                </li>
                <li
                  className="cursor-pointer p-2 rounded transition hover:bg-white/20"
                  onClick={() => handleNavigate("/historial")}
                >
                  📋 Historial
                </li>
              </>
            )}

            {isWorker && (
              <li className="text-sm opacity-70 mt-4">
                Acceso limitado a funciones administrativas.
              </li>
            )}
          </ul>
        </div>
      </div>
    </>
  );
}