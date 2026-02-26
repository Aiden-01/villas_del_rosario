import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";

export default function Layout() {
  const [menuOpen, setMenuOpen] = useState(false);

  const user = JSON.parse(localStorage.getItem("user"));
  const role = user?.role;

  return (
    <div className="min-h-screen bg-[var(--bg)] relative">

      {/* BOTÓN HAMBURGUESA */}
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        className="fixed top-4 left-4 z-[200] bg-[var(--primary)] text-white px-3 py-2 rounded-lg shadow-lg hover:scale-105 transition"
      >
        {menuOpen ? "✕" : "☰"}
      </button>

      {/* SIDEBAR */}
      <Sidebar
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
        role={role}
      />

      {/* CONTENIDO */}
      <div className="p-6">
        <Outlet />
      </div>
    </div>
  );
}