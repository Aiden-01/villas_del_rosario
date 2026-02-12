import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";

export default function Dashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="relative min-h-screen bg-[var(--bg)] text-[var(--text)] transition-colors">
      {/* Sidebar */}
      <Sidebar menuOpen={menuOpen} setMenuOpen={setMenuOpen} role={user?.role} />

      {/* Botón Hamburger */}
      <button
        className="p-2 m-4 rounded-lg bg-[var(--secondary)] hover:opacity-90 text-white fixed top-0 left-0 z-50 shadow"
        onClick={() => setMenuOpen(!menuOpen)}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
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
          <h1 className="text-3xl font-bold">
            Bienvenido, {user?.name || "Usuario"}
          </h1>
          <p className="opacity-70">
            Panel principal del sistema de préstamos
          </p>
        </div>

        {/* acciones rápidas */}
        <div className="bg-[var(--card)] p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <h2 className="text-lg font-semibold text-[var(--secondary)] mb-4">
            Acciones rápidas
          </h2>

          <div className="flex flex-wrap gap-4">
            <button className="bg-[var(--secondary)] hover:opacity-90 text-white px-4 py-2 rounded-lg shadow transition hover:scale-105">
              Nuevo préstamo
            </button>

            <button className="bg-[var(--primary)] hover:opacity-90 text-white px-4 py-2 rounded-lg shadow transition hover:scale-105">
              Registrar pago
            </button>

            <button
              onClick={() => navigate("/clientes/crear")}
              className="bg-[var(--primary)] hover:opacity-90 text-white px-4 py-2 rounded-lg shadow transition hover:scale-105"
            >
              Crear Cliente
            </button>

            <button className="bg-gray-600 hover:opacity-90 text-white px-4 py-2 rounded-lg shadow transition hover:scale-105">
              Ver clientes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
