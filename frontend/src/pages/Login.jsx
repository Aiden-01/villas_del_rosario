import { useState, useEffect } from "react";
import { Eye, EyeOff, Moon, Sun, HandCoins, AlertCircle } from "lucide-react";
import { ROUTES } from "../services/api";

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [dark, setDark] = useState(
    document.documentElement.classList.contains("dark")
  );

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "dark") {
      document.documentElement.classList.add("dark");
      setDark(true);
    } else {
      document.documentElement.classList.remove("dark");
      setDark(false);
    }
  }, []);

  const toggleDark = () => {
    const html = document.documentElement;
    if (dark) {
      html.classList.remove("dark");
      localStorage.setItem("theme", "light");
    } else {
      html.classList.add("dark");
      localStorage.setItem("theme", "dark");
    }
    setDark(!dark);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(ROUTES.LOGIN, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Credenciales incorrectas");
        return;
      }
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      window.location.href = "/dashboard";
    } catch {
      setError("No se pudo conectar con el servidor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 transition-colors"
      style={{ backgroundColor: "var(--bg)", color: "var(--text)" }}
    >
      {/* TOGGLE DARK MODE */}
      <button
        onClick={toggleDark}
        aria-label="Cambiar tema"
        className="fixed top-4 right-4 w-10 h-10 flex items-center justify-center rounded-xl shadow-lg transition hover:scale-105 active:scale-95"
        style={{
          backgroundColor: "var(--card)",
          border: "1px solid var(--card-border)",
          color: "var(--text)",
        }}
      >
        {dark
          ? <Sun size={17} className="text-yellow-400" />
          : <Moon size={17} />
        }
      </button>

      {/* TARJETA */}
      <div
        className="w-full max-w-sm rounded-2xl shadow-2xl p-8"
        style={{
          backgroundColor: "var(--card)",
          border: "1px solid var(--card-border)",
        }}
      >
        {/* LOGO */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg mb-4"
            style={{ backgroundColor: "var(--primary)" }}
          >
            <HandCoins size={26} />
          </div>
          <h1 className="text-xl font-bold">Inversiones CRUMAN</h1>
          <p className="text-sm opacity-60 mt-1">Ingresa tus credenciales</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          {/* USUARIO */}
          <div>
            <label className="text-sm font-medium opacity-80 block mb-1">
              Usuario
            </label>
            <input
              type="text"
              required
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl outline-none transition"
              style={{
                backgroundColor: "var(--bg)",
                color: "var(--text)",
                border: "1px solid var(--card-border)",
              }}
            />
          </div>

          {/* CONTRASEÑA */}
          <div>
            <label className="text-sm font-medium opacity-80 block mb-1">
              Contraseña
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2.5 pr-10 rounded-xl outline-none transition"
                style={{
                  backgroundColor: "var(--bg)",
                  color: "var(--text)",
                  border: "1px solid var(--card-border)",
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-80 transition"
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          {/* ERROR */}
          {error && (
            <div
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm"
              style={{ backgroundColor: "#fee2e2", color: "#dc2626" }}
            >
              <AlertCircle size={15} className="shrink-0" />
              {error}
            </div>
          )}

          {/* BOTÓN */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl text-white font-semibold shadow transition hover:opacity-90 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60"
            style={{ backgroundColor: "var(--primary)" }}
          >
            {loading ? "Iniciando sesión..." : "Iniciar sesión"}
          </button>
        </form>

        {/* LEYENDA */}
        <p className="text-xs text-center opacity-50 mt-6">
          ¿Olvidaste tu contraseña? Contacta al administrador del sistema.
        </p>
      </div>
    </div>
  );
}