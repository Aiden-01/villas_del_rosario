import { useState } from "react";
import { Eye, EyeOff, Moon, Sun } from "lucide-react";
import { ROUTES } from "../services/api";

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const toggleDarkMode = () => {
    document.documentElement.classList.toggle("dark");
  };

  const isDark = document.documentElement.classList.contains("dark");

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

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
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] text-[var(--text)] transition-colors">

      {/* toggle modo */}
      <button
        onClick={toggleDarkMode}
        className="absolute top-4 right-4 p-2 rounded-lg bg-[var(--card)] shadow"
      >
        {isDark ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      {/* tarjeta */}
      <div className="w-full max-w-md bg-[var(--card)] shadow-xl rounded-2xl p-8 border border-gray-200 dark:border-gray-700">

        {/* header */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 bg-[var(--secondary)] rounded-xl flex items-center justify-center text-white text-xl font-bold shadow">
            $
          </div>

          <h1 className="mt-3 text-xl font-bold">
            Sistema de Préstamos
          </h1>

          <p className="text-sm opacity-70">
            Ingresa tus credenciales
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          {/* usuario */}
          <div>
            <label className="text-sm opacity-80">
              Usuario
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full mt-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[var(--primary)] outline-none bg-transparent"
            />
          </div>

          {/* contraseña */}
          <div>
            <label className="text-sm opacity-80">
              Contraseña
            </label>

            <div className="relative mt-1">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[var(--primary)] outline-none bg-transparent"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-2 opacity-60"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* recordar */}
          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 opacity-80">
              <input
                type="checkbox"
                checked={remember}
                onChange={() => setRemember(!remember)}
              />
              Recordar sesión
            </label>

            <a
              href="#"
              className="text-[var(--secondary)] hover:underline"
            >
              ¿Olvidaste tu contraseña?
            </a>
          </div>

          {/* botón */}
          <button
            type="submit"
            className="w-full bg-[var(--primary)] hover:opacity-90 text-white py-2 rounded-lg shadow transition hover:scale-[1.02]"
          >
            Iniciar sesión
          </button>

          {/* error */}
          {error && (
            <p className="text-red-500 text-sm text-center">{error}</p>
          )}
        </form>
      </div>
    </div>
  );
}
