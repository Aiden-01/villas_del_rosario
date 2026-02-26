import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { User, Moon, Sun } from "lucide-react";

export default function Sidebar({ menuOpen, setMenuOpen, role }) {
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);

  const user = JSON.parse(localStorage.getItem("user"));

  const isAdmin = role === "admin";
  const isWorker = role === "worker";

  /* =========================
     DARK MODE GLOBAL
  ========================= */
  const [dark, setDark] = useState(
    localStorage.getItem("theme") === "dark"
  );

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

  /* ========================= */

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
      {/* PERFIL ARRIBA A LA DERECHA */}
      <div className="fixed top-4 right-4 z-[120] flex items-center gap-3">
        {/* BOTÓN DARKMODE */}
        <button
          onClick={toggleDark}
          className="relative w-14 h-8 flex items-center rounded-full px-1 bg-[var(--secondary)] transition-all duration-300 shadow-lg"
        >
          <div
            className={`absolute bg-white w-6 h-6 rounded-full shadow-md transform transition-transform duration-300 flex items-center justify-center ${
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
        <button
          onClick={() => setProfileOpen(!profileOpen)}
          className="flex items-center gap-2 bg-[var(--card)] border border-gray-200 dark:border-gray-700 shadow-lg px-3 py-2 rounded-full hover:scale-105 transition"
        >
          <div className="w-8 h-8 rounded-full bg-[var(--primary)] flex items-center justify-center text-white">
            <User size={16} />
          </div>
          <span className="text-sm font-semibold">
            {user?.username}
          </span>
        </button>

        {/* dropdown */}
        {profileOpen && (
          <div className="absolute right-0 top-12 w-40 bg-[var(--card)] rounded-xl shadow-xl overflow-hidden border border-gray-200 dark:border-gray-700 animate-fade-in">
            <button
              onClick={logout}
              className="w-full text-left px-4 py-2 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-600"
            >
              Cerrar sesión
            </button>
          </div>
        )}
      </div>

      {/* SIDEBAR */}
      <div
        className={`fixed top-0 left-0 h-full w-64 bg-[var(--secondary)] text-white transform transition-transform duration-300 ${
          menuOpen ? "translate-x-0" : "-translate-x-full"
        } z-[100] shadow-2xl`}
      >
        <div className="relative pt-16 px-6 pb-6">
    

          <h2 className="text-2xl font-bold mb-6">Menú</h2>

          <ul className="space-y-4">
            <li
              className="cursor-pointer hover:bg-white/20 p-2 rounded transition"
              onClick={() => handleNavigate("/dashboard")}
            >
              Inicio
            </li>

            <li
              className="cursor-pointer hover:bg-white/20 p-2 rounded transition"
              onClick={() => handleNavigate("/clientes")}
            >
              Ver Clientes
            </li>

            <li
              className="cursor-pointer hover:bg-white/20 p-2 rounded transition"
              onClick={() => handleNavigate("/clientes/crear")}
            >
              Crear Cliente
            </li>

            <li
              className="cursor-pointer hover:bg-white/20 p-2 rounded transition"
              onClick={() => handleNavigate("/cobros")}
            >
              Registrar Cobro
            </li>

            {isAdmin && (
              <>
                <li
                  className="cursor-pointer hover:bg-white/20 p-2 rounded transition"
                  onClick={() => handleNavigate("/usuarios/crear")}
                >
                  Crear Usuario
                </li>

                <li
                  className="cursor-pointer hover:bg-white/20 p-2 rounded transition"
                  onClick={() => handleNavigate("/usuarios")}
                >
                  Gestionar Usuarios
                </li>

                <li
                  className="cursor-pointer hover:bg-white/20 p-2 rounded transition"
                  onClick={() => handleNavigate("/reportes")}
                >
                  Reportes
                </li>
              </>
            )}

            {isWorker && (
              <li className="text-sm opacity-80 mt-4">
                Acceso limitado a funciones administrativas.
              </li>
            )}
          </ul>
        </div>
      </div>
    </>
  );
}
