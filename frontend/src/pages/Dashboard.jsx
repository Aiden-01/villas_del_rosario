import { useState } from "react";
import Sidebar from "../components/Sidebar";

export default function Dashboard() {
  const user = JSON.parse(localStorage.getItem("user"));
  const [menuOpen, setMenuOpen] = useState(false);


  return (
  <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800">
    {/* luces */}
    <div className="absolute w-72 h-72 bg-blue-500/20 rounded-full blur-3xl top-10 left-10"></div>
    <div className="absolute w-72 h-72 bg-purple-500/20 rounded-full blur-3xl bottom-10 right-10"></div>

    {/* Sidebar */}
    <Sidebar menuOpen={menuOpen} setMenuOpen={setMenuOpen} role={user?.role} />

    {/* Botón Hamburger */}
    <button
      className="p-2 m-4 rounded bg-blue-700 text-white fixed top-0 left-0 z-50 shadow-lg"
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

    {/* CONTENIDO */}
    <div
      className={`transition-transform duration-300 ${
        menuOpen ? "translate-x-64" : "translate-x-0"
      } p-6 pt-24`}
    >
      {/* bienvenida */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">
          Bienvenido, {user?.name || "Usuario"}
        </h1>
        <p className="text-blue-200">
          Panel principal del sistema de préstamos
        </p>
      </div>


      {/* acciones rápidas */}
      <div className="bg-white/10 backdrop-blur-lg p-6 rounded-xl border border-white/10 shadow-lg">
        <h2 className="text-lg font-semibold text-white mb-4">
          Acciones rápidas
        </h2>

        <div className="flex flex-wrap gap-4">
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow">
            Nuevo préstamo
          </button>

          <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg shadow">
            Registrar pago
          </button>

          <button className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg shadow">
            Ver clientes
          </button>
        </div>
      </div>
    </div>
  </div>
);
}
