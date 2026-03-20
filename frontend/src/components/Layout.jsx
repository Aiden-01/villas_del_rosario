import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";

export default function Layout() {
  const [menuOpen, setMenuOpen] = useState(false);

  const user = JSON.parse(localStorage.getItem("user"));
  const role = user?.role;

  // Bloquear scroll cuando el menú está abierto
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  return (
    <div className="min-h-screen flex flex-col relative" style={{ backgroundColor: "var(--bg)" }}>

      {/* BOTÓN HAMBURGUESA ANIMADO */}
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
        className="fixed top-4 left-4 z-[200] w-11 h-11 flex flex-col items-center justify-center gap-[5px] rounded-xl shadow-lg transition-all duration-300 hover:scale-105 active:scale-95"
        style={{ backgroundColor: "var(--primary)" }}
      >
        <span
          className="block h-[2px] bg-white rounded-full transition-all duration-300 origin-center"
          style={{
            width: "20px",
            transform: menuOpen ? "translateY(7px) rotate(45deg)" : "none",
          }}
        />
        <span
          className="block h-[2px] bg-white rounded-full transition-all duration-300"
          style={{
            width: "14px",
            opacity: menuOpen ? 0 : 1,
            transform: menuOpen ? "scaleX(0)" : "scaleX(1)",
          }}
        />
        <span
          className="block h-[2px] bg-white rounded-full transition-all duration-300 origin-center"
          style={{
            width: "20px",
            transform: menuOpen ? "translateY(-7px) rotate(-45deg)" : "none",
          }}
        />
      </button>

      {/* BACKDROP */}
      <div
        onClick={() => setMenuOpen(false)}
        className="fixed inset-0 z-[90] transition-all duration-300"
        style={{
          backgroundColor: "rgba(0,0,0,0.45)",
          backdropFilter: menuOpen ? "blur(2px)" : "blur(0px)",
          opacity: menuOpen ? 1 : 0,
          pointerEvents: menuOpen ? "auto" : "none",
        }}
      />

      {/* SIDEBAR */}
      <Sidebar menuOpen={menuOpen} setMenuOpen={setMenuOpen} role={role} />

      {/* CONTENIDO */}
      <div className="flex-1 p-6">
        <Outlet />
      </div>

      {/* FOOTER */}
      <footer className="text-center py-4 px-6">
        <p className="text-xs opacity-25">
          © 2026 <span className="font-semibold">hercor.nexus</span> — Todos los derechos reservados
        </p>
      </footer>

    </div>
  );
}