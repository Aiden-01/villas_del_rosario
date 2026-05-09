import { Outlet, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Menu } from "lucide-react";
import Sidebar from "./Sidebar";
import { authFetch, clearAuthData, getRefreshToken, ROUTES } from "../services/api";

export default function Layout() {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const usuario = JSON.parse(localStorage.getItem("user"));

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) setMenuOpen(false);
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
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      {isMobile && (
        <button
          onClick={() => setMenuOpen(true)}
          style={{
            position: "fixed",
            top: 14,
            left: 14,
            zIndex: 200,
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
          padding: isMobile ? "3.5rem 1rem 1.5rem" : "2rem",
          transition: "margin 0.3s ease",
          minHeight: "100vh",
        }}
      >
        <Outlet />
      </main>
    </div>
  );
}
