import { Outlet, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Menu } from "lucide-react";
import Sidebar from "./Sidebar";
import { authFetch, clearAuthData, getRefreshToken, ROUTES } from "../services/api";

export default function Layout() {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  const usuario = JSON.parse(localStorage.getItem("user"));

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) setCollapsed(false);
      else setMenuOpen(false);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    document.body.style.overflow = isMobile && menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobile, menuOpen]);

  const handleLogout = async () => {
    const token = localStorage.getItem("token");

    try {
      if (token) {
        await authFetch(ROUTES.LOGOUT, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ refreshToken: getRefreshToken() }),
        });
      }
    } catch (error) {
      console.error("Logout error:", error);
    }

    clearAuthData();
    navigate("/");
  };

  const sidebarWidth = isMobile ? 0 : collapsed ? 80 : 260;

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        overflowX: "clip",
        background: "var(--bg)",
      }}
    >
      {isMobile && (
        <header
          style={{
            position: "sticky",
            top: 0,
            zIndex: 40,
            minHeight: 52,
            padding: "0.5rem 0.75rem",
            display: "flex",
            alignItems: "center",
            background: "var(--card)",
            borderBottom: "1px solid var(--card-border)",
          }}
        >
          <button
            type="button"
            aria-label="Abrir menu"
            onClick={() => setMenuOpen(true)}
            style={{
              flex: "0 0 auto",
              background: "var(--primary)",
              color: "#fff",
              border: "none",
              padding: "0.5rem",
              borderRadius: 8,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
            }}
          >
            <Menu size={22} />
          </button>
        </header>
      )}

      <Sidebar
        usuario={usuario}
        onLogout={handleLogout}
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
        isMobile={isMobile}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
      />

      <main
        style={{
          marginLeft: sidebarWidth,
          minWidth: 0,
          padding: isMobile ? "0.75rem 0.75rem 1.25rem" : "2rem",
          transition: "margin 0.3s ease",
          minHeight: isMobile ? "calc(100vh - 52px)" : "100vh",
          overflowX: "clip",
        }}
      >
        <Outlet />
      </main>
    </div>
  );
}
