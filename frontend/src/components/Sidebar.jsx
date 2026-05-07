import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  HandCoins,
  CalendarDays,
  FileBarChart2,
  UserCog,
  ClipboardList,
  X,
  LogOut,
  Menu,
  Moon,
  Sun,
} from "lucide-react";

const NAV = [
  { label: "Inicio", path: "/dashboard", icon: LayoutDashboard, delay: 0 },
  { label: "Clientes", path: "/clientes", icon: Users, delay: 50 },
  { label: "Ventas", path: "/ventas", icon: HandCoins, delay: 100 },
  { label: "Pagos", path: "/pagos", icon: CalendarDays, delay: 150 },
];

const NAV_ADMIN = [
  { label: "Reportes", path: "/reportes", icon: FileBarChart2, delay: 200 },
  { label: "Usuarios", path: "/usuarios", icon: UserCog, delay: 250 },
  { label: "Historial", path: "/historial", icon: ClipboardList, delay: 300 },
];

const SIDEBAR_BG = "#0f172a";
const SIDEBAR_BG_ITEM_HOVER = "rgba(255,255,255,0.06)";

export default function Sidebar({
  usuario,
  menuOpen,
  setMenuOpen,
  isMobile,
  onLogout,
  collapsed,
  setCollapsed,
}) {
  const navigate = useNavigate();
  const location = useLocation();

  const [dark, setDark] = useState(localStorage.getItem("theme") === "dark");
  const visible = !isMobile || menuOpen;

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

  const handleNav = (path) => {
    navigate(path);
    if (isMobile) setMenuOpen(false);
  };

  const items = usuario?.role === "admin" ? [...NAV, ...NAV_ADMIN] : NAV;

  return (
    <>
      {isMobile && menuOpen && (
        <div
          onClick={() => setMenuOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            backdropFilter: "blur(2px)",
            zIndex: 90,
          }}
        />
      )}

      <aside
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          height: "100%",
          width: collapsed ? 80 : 260,
          background: SIDEBAR_BG,
          color: "#fff",
          zIndex: 100,
          transform: isMobile ? (menuOpen ? "translateX(0)" : "translateX(-100%)") : "translateX(0)",
          transition: "all 0.35s cubic-bezier(0.34,1.56,0.64,1)",
          display: "flex",
          flexDirection: "column",
          borderRight: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div style={{ padding: "1rem 1rem 0.5rem" }}>
          <button
            onClick={() => {
              if (isMobile) setMenuOpen(!menuOpen);
              else setCollapsed(!collapsed);
            }}
            style={{
              background: "transparent",
              border: "none",
              color: "#fff",
              cursor: "pointer",
              padding: "0.4rem",
              borderRadius: 6,
              display: "flex",
            }}
          >
            {isMobile ? <X size={20} /> : <Menu size={20} />}
          </button>

          {!collapsed && (
            <div style={{ marginTop: "0.75rem" }}>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl overflow-hidden shadow-lg ring-1 ring-white/20 bg-white">
                  <img
                    src="/logo.jpeg"
                    alt="Logo Villas del Rosario"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h2
                    style={{
                      fontSize: "1rem",
                      fontWeight: 700,
                      color: "#fff",
                      margin: 0,
                    }}
                  >
                    Villas del Rosario
                  </h2>
                  <p style={{ fontSize: "0.75rem", opacity: 0.5, margin: "2px 0 0" }}>
                    Sistema de lotificaciones
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <nav style={{ flex: 1, padding: "0.75rem 0.5rem", overflowY: "auto" }}>
          {items.map((item) => {
            const { label, path, delay } = item;
            const ItemIcon = item.icon;
            const isActive = location.pathname.startsWith(path);
            return (
              <div key={path} style={{ position: "relative" }}>
                <button
                  onClick={() => handleNav(path)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: collapsed ? "center" : "flex-start",
                    gap: "0.75rem",
                    width: "100%",
                    padding: "0.65rem 0.75rem",
                    borderRadius: 10,
                    marginBottom: 4,
                    border: "none",
                    cursor: "pointer",
                    background: isActive ? "var(--primary)" : SIDEBAR_BG_ITEM_HOVER,
                    color: isActive ? "#fff" : "rgba(255,255,255,0.72)",
                    fontWeight: isActive ? 600 : 400,
                    fontSize: "0.9rem",
                    opacity: visible ? 1 : 0,
                    transform: visible ? "translateX(0)" : "translateX(-10px)",
                    transition: `opacity 0.3s ease ${delay}ms,
                                 transform 0.3s ease ${delay}ms,
                                 background 0.15s ease,
                                 color 0.15s ease`,
                  }}
                >
                  <ItemIcon size={20} />
                  {!collapsed && <span>{label}</span>}
                </button>
              </div>
            );
          })}
        </nav>

        <div
          style={{
            padding: "0.75rem 0.5rem 1rem",
            borderTop: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <button
            onClick={() => setDark(!dark)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: collapsed ? "center" : "flex-start",
              gap: "0.6rem",
              width: "100%",
              padding: "0.6rem 0.75rem",
              marginBottom: "0.4rem",
              background: "transparent",
              border: "none",
              color: "rgba(255,255,255,0.72)",
              cursor: "pointer",
              borderRadius: 8,
              fontSize: "0.9rem",
            }}
          >
            {dark ? <Sun size={18} /> : <Moon size={18} />}
            {!collapsed && (dark ? "Modo claro" : "Modo oscuro")}
          </button>

          <button
            onClick={onLogout}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: collapsed ? "center" : "flex-start",
              gap: "0.6rem",
              width: "100%",
              padding: "0.6rem 0.75rem",
              color: "#f87171",
              border: "none",
              background: "transparent",
              cursor: "pointer",
              borderRadius: 8,
              fontSize: "0.9rem",
            }}
          >
            <LogOut size={18} />
            {!collapsed && "Cerrar sesion"}
          </button>
        </div>
      </aside>
    </>
  );
}
