import { useNavigate } from "react-router-dom";
import { useState, useRef, useEffect } from "react";

export default function Sidebar({ menuOpen, setMenuOpen, role }) {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));

  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

  const isAdmin = role === "admin";
  const isWorker = role === "worker";

  const handleNavigate = (path) => {
    navigate(path);
    setMenuOpen(false);
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/";
  };

  // cerrar dropdown si hacen click afuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <>
      {/* ================= HEADER PERFIL ================= */}
      <div className="fixed top-0 right-0 p-4 z-40" ref={profileRef}>
        <div
          onClick={() => setProfileOpen(!profileOpen)}
          className="flex items-center gap-3 bg-white shadow-lg px-4 py-2 rounded-full cursor-pointer 
                     hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-200"
        >
          <span className="font-semibold text-gray-700">
            {user?.username}
          </span>

          {/* avatar */}
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 
                          flex items-center justify-center text-white font-bold shadow-md">
            {user?.username?.charAt(0).toUpperCase()}
          </div>

          {/* flechita */}
          <div
            className={`transition-transform duration-300 ${
              profileOpen ? "rotate-180" : ""
            }`}
          >
            ▼
          </div>
        </div>

        {/* dropdown animado */}
        <div
          className={`absolute right-0 mt-3 w-52 origin-top-right transition-all duration-200 ${
            profileOpen
              ? "opacity-100 scale-100 translate-y-0"
              : "opacity-0 scale-95 -translate-y-2 pointer-events-none"
          }`}
        >
          <div className="bg-white rounded-xl shadow-2xl overflow-hidden border">
            <div className="px-4 py-3 border-b text-sm text-gray-600 bg-gray-50">
              <div className="font-semibold">{user?.username}</div>
              <div className="text-xs opacity-70">Rol: {user?.role}</div>
            </div>

            <button
              onClick={logout}
              className="w-full text-left px-4 py-3 text-red-600 hover:bg-red-50 
                         transition-colors duration-150"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>

      {/* ================= SIDEBAR ================= */}
      <div
        className={`fixed top-0 left-0 h-full w-64 bg-blue-700 text-white transform transition-transform duration-300 ${
          menuOpen ? "translate-x-0" : "-translate-x-full"
        } z-[100]`}
      >
        <div className="relative p-6">
          {/* cerrar */}
          <button
            className="absolute top-4 right-4 text-white text-xl hover:scale-110 transition"
            onClick={() => setMenuOpen(false)}
          >
            ✕
          </button>

          <h2 className="text-2xl font-bold mb-6">Menú</h2>

          <ul className="space-y-3">
            {[
              { label: "Dashboard", path: "/dashboard" },
              { label: "Ver Clientes", path: "/clientes" },
              { label: "Registrar Cobro", path: "/cobros" },
            ].map((item) => (
              <li
                key={item.path}
                onClick={() => handleNavigate(item.path)}
                className="cursor-pointer hover:bg-blue-600 p-2 rounded 
                           hover:translate-x-1 transition-all duration-150"
              >
                {item.label}
              </li>
            ))}

            {isAdmin && (
              <>
                <li
                  onClick={() => handleNavigate("/usuarios/crear")}
                  className="cursor-pointer hover:bg-blue-600 p-2 rounded hover:translate-x-1 transition-all duration-150"
                >
                  Crear Usuario
                </li>

                <li
                  onClick={() => handleNavigate("/usuarios")}
                  className="cursor-pointer hover:bg-blue-600 p-2 rounded hover:translate-x-1 transition-all duration-150"
                >
                  Gestionar Usuarios
                </li>

                <li
                  onClick={() => handleNavigate("/reportes")}
                  className="cursor-pointer hover:bg-blue-600 p-2 rounded hover:translate-x-1 transition-all duration-150"
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
