import { useState } from "react"
import { Eye, EyeOff, Moon, Sun } from "lucide-react"
import { ROUTES } from "../services/api" // ✅ importamos rutas

export default function Login() {
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(false)
  const [dark, setDark] = useState(false)

  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")

  const handleLogin = async (e) => {
    e.preventDefault()
    setError("")

    try {
      const res = await fetch(ROUTES.LOGIN, { // ✅ usamos la ruta con /api
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.message || "Credenciales incorrectas")
        return
      }

      localStorage.setItem("token", data.token)
      localStorage.setItem("user", JSON.stringify(data.user))

      window.location.href = "/dashboard"
    } catch (err) {
      setError("No se pudo conectar con el servidor")
    }
  }

  return (
    <div className={dark ? "dark" : ""}>
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 transition-colors">

        {/* botón dark mode */}
        <button
          onClick={() => setDark(!dark)}
          className="absolute top-4 right-4 p-2 rounded bg-gray-200 dark:bg-gray-700"
        >
          {dark ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* tarjeta */}
        <div className="w-full max-w-md bg-white dark:bg-gray-800 shadow-xl rounded-2xl p-8 transition-all">

          {/* logo */}
          <div className="flex flex-col items-center mb-6">
            <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center text-white text-xl font-bold">
              App
            </div>
            <h1 className="mt-3 text-xl font-bold text-gray-800 dark:text-white">
              Sistema de Cobros
            </h1>
            <p className="text-sm text-gray-500">
              Ingresa tus credenciales
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {/* usuario */}
            <div>
              <label className="text-sm text-gray-600 dark:text-gray-300">
                Usuario
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full mt-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>

            {/* contraseña */}
            <div>
              <label className="text-sm text-gray-600 dark:text-gray-300">
                Contraseña
              </label>
              <div className="relative mt-1">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-2 text-gray-500"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* recordar */}
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={() => setRemember(!remember)}
                />
                Recordar sesión
              </label>

              <a
                href="#"
                className="text-blue-600 hover:underline"
              >
                ¿Olvidaste tu contraseña?
              </a>
            </div>

            {/* botón */}
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition transform hover:scale-[1.02]"
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
    </div>
  )
}
