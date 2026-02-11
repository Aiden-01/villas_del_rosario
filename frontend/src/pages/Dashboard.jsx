import { useState } from "react";
import Sidebar from "../components/Sidebar";

export default function Dashboard() {
  const user = JSON.parse(localStorage.getItem("user"));
  const [menuOpen, setMenuOpen] = useState(false);

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/";
  };

  return (
    <div className="relative min-h-screen bg-gray-100">
      {/* Sidebar */}
      <Sidebar menuOpen={menuOpen} setMenuOpen={setMenuOpen} role={user?.role} />

      {/* Botón Hamburger */}
      <button
        className="p-2 m-4 rounded bg-blue-700 text-white fixed top-0 left-0 z-50"
        onClick={() => setMenuOpen(!menuOpen)}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Contenido principal que se desplaza */}
      <div className={`transition-transform duration-300 ${menuOpen ? "translate-x-64" : "translate-x-0"} p-6 pt-20`}>
        <h1 className="text-2xl font-bold mb-4">Bienvenido al Dashboard</h1>
        <p>Presiona las 3 barras en la esquina superior izquierda para abrir el menú.</p>
        <button
          onClick={logout}
          className="mt-4 bg-red-500 px-3 py-1 rounded text-white"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
