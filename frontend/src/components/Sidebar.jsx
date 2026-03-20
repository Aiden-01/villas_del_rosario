import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  User, Moon, Sun,
  LayoutDashboard, Users, HandCoins,
  MapPin, Map, UserCog, FileBarChart2, ClipboardList,
  LogOut
} from "lucide-react";

// Cada item del menú tiene delay para el efecto stagger
const MENU_ITEMS_BASE = [
  { label: "Inicio",        path: "/dashboard",    icon: LayoutDashboard, delay: 0   },
  { label: "Clientes",      path: "/clientes",     icon: Users,           delay: 40  },
  { label: "Préstamos",     path: "/prestamos",    icon: HandCoins,       delay: 80  },
  { label: "Ruta de Hoy",   path: "/ruta-del-dia", icon: MapPin,          delay: 120 },
];

const MENU_ITEMS_ADMIN = [
  { label: "Rutas",         path: "/rutas",        icon: Map,             delay: 160 },
  { label: "Usuarios",      path: "/usuarios",     icon: UserCog,         delay: 200 },
  { label: "Reportes",      path: "/reportes",     icon: FileBarChart2,   delay: 240 },
  { label: "Historial",     path: "/historial",    icon: ClipboardList,   delay: 280 },
];

export default function Sidebar({ menuOpen, setMenuOpen, role }) {
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  // itemsVisible controla el stagger: true cuando el drawer ya abrió
  const [itemsVisible, setItemsVisible] = useState(false);

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

  // Cuando el drawer abre, activa el stagger con un pequeño delay
  // Cuando cierra, lo quita inmediatamente para resetear
  useEffect(() => {
    let timeout;
    if (menuOpen) {
      timeout = setTimeout(() => setItemsVisible(true), 80);
    } else {
      setItemsVisible(false);
    }
    return () => clearTimeout(timeout);
  }, [menuOpen]);

  // Cerrar perfil si se cierra el sidebar
  useEffect(() => {
    if (!menuOpen) setProfileOpen(false);
  }, [menuOpen]);

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

  const allItems = isAdmin
    ? [...MENU_ITEMS_BASE, ...MENU_ITEMS_ADMIN]
    : MENU_ITEMS_BASE;

  return (
    <>
      {/* PERFIL + DARKMODE — top right */}
      <div className="fixed top-4 right-4 z-[120] flex items-center gap-3">

        {/* TOGGLE DARKMODE */}
        <button
          onClick={toggleDark}
          aria-label="Cambiar tema"
          className="relative w-14 h-8 flex items-center rounded-full px-1 transition-all duration-300 shadow-lg"
          style={{ backgroundColor: "var(--secondary)" }}
        >
          <div
            className="absolute w-6 h-6 rounded-full shadow-md transform transition-transform duration-300 flex items-center justify-center bg-white"
            style={{ transform: dark ? "translateX(24px)" : "translateX(0px)" }}
          >
            {dark
              ? <Moon size={14} className="text-slate-700" />
              : <Sun  size={14} className="text-yellow-500" />
            }
          </div>
        </button>

        {/* PERFIL */}
        <div className="relative">
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2 shadow-lg px-3 py-2 rounded-full hover:scale-105 active:scale-95 transition-transform duration-150"
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

          {/* DROPDOWN PERFIL */}
          <div
            className="absolute right-0 top-12 w-44 rounded-xl shadow-xl overflow-hidden transition-all duration-200"
            style={{
              backgroundColor: "var(--card)",
              border: "1px solid var(--card-border)",
              opacity: profileOpen ? 1 : 0,
              transform: profileOpen ? "translateY(0) scale(1)" : "translateY(-8px) scale(0.95)",
              pointerEvents: profileOpen ? "auto" : "none",
              transformOrigin: "top right",
            }}
          >
            <button
              onClick={logout}
              className="w-full flex items-center gap-2 px-4 py-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors duration-150"
            >
              <LogOut size={15} />
              <span className="text-sm font-medium">Cerrar sesión</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── DRAWER ─── */}
      {/*
        Spring animation: cubic-bezier(0.34, 1.56, 0.64, 1) — overshoot suave
        Al cerrar: ease-in rápido para que se sienta responsivo
      */}
      <div
        className="fixed top-0 left-0 h-full w-72 text-white z-[100] shadow-2xl flex flex-col"
        style={{
          backgroundColor: "var(--secondary)",
          transform: menuOpen ? "translateX(0)" : "translateX(-100%)",
          transition: menuOpen
            ? "transform 0.42s cubic-bezier(0.34, 1.56, 0.64, 1)"
            : "transform 0.28s cubic-bezier(0.4, 0, 1, 1)",
        }}
      >
        {/* Header del drawer */}
        <div className="pt-6 px-6 pb-4 border-b border-white/10">
          {/* Logo / nombre app */}
          <div className="mt-10 flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg"
              style={{ backgroundColor: "var(--primary)" }}
            >
              $
            </div>
            <div>
              <p className="font-bold text-base leading-tight">Cartagena</p>
              <p className="text-xs opacity-50 capitalize">{role}</p>
            </div>
          </div>
        </div>

        {/* Navegación con stagger */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {allItems.map(({ label, path, icon: Icon, delay }) => (
            <button
              key={path}
              onClick={() => handleNavigate(path)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left font-medium text-sm
                         hover:bg-white/15 active:bg-white/25 active:scale-[0.98]
                         transition-all duration-150"
              style={{
                // Stagger: cada item entra con su propio delay
                opacity: itemsVisible ? 1 : 0,
                transform: itemsVisible ? "translateX(0)" : "translateX(-18px)",
                transition: `opacity 0.3s ease ${delay}ms, transform 0.35s cubic-bezier(0.34, 1.2, 0.64, 1) ${delay}ms, background-color 0.15s ease`,
              }}
            >
              <span className="opacity-80 flex-shrink-0">
                <Icon size={18} />
              </span>
              <span>{label}</span>
            </button>
          ))}

          {isWorker && (
            <p className="text-xs opacity-40 px-4 pt-4">
              Acceso limitado a funciones administrativas.
            </p>
          )}
        </nav>

        {/* Footer del drawer: logout accesible desde el sidebar también */}
        <div className="px-3 pb-6 pt-2 border-t border-white/10">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-sm
                       text-red-300 hover:bg-red-500/20 active:scale-[0.98]
                       transition-all duration-150"
            style={{
              opacity: itemsVisible ? 1 : 0,
              transform: itemsVisible ? "translateX(0)" : "translateX(-18px)",
              transition: `opacity 0.3s ease 320ms, transform 0.35s cubic-bezier(0.34, 1.2, 0.64, 1) 320ms`,
            }}
          >
            <LogOut size={18} />
            <span className="font-medium">Cerrar sesión</span>
          </button>
        </div>
      </div>
    </>
  );
}
