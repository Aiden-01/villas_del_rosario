import { useState } from "react";
import Sidebar from "../components/Sidebar";
import { useNavigate } from "react-router-dom";

export const ROUTES = {
  USERS: "http://localhost:3333/api/users", // ✅ ruta del backend
};

export default function CrearUsuario() {
  const user = JSON.parse(localStorage.getItem("user"));
  const [menuOpen, setMenuOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    username: "",
    password: "",
    role: "trabajador",
  });
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(ROUTES.USERS, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Error creando usuario");
        return;
      }

      alert("Usuario creado correctamente!");
      navigate("/dashboard");
    } catch {
      setError("No se pudo conectar con el servidor");
    }
  };

return (
  <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800">
    {/* luces decorativas */}
    <div className="absolute w-72 h-72 bg-blue-500/30 rounded-full blur-3xl top-10 left-10"></div>
    <div className="absolute w-72 h-72 bg-purple-500/20 rounded-full blur-3xl bottom-10 right-10"></div>

    {/* Sidebar */}
    <Sidebar menuOpen={menuOpen} setMenuOpen={setMenuOpen} role={user?.role} />

    {/* Botón Hamburger */}
    <button
      className="p-2 m-4 rounded bg-blue-700 text-white fixed top-0 left-0 z-50 shadow-lg"
      onClick={() => setMenuOpen(!menuOpen)}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    </button>

    {/* Contenido */}
    <div
      className={`transition-transform duration-300 ${
        menuOpen ? "translate-x-64" : "translate-x-0"
      } flex justify-center items-start pt-24 px-4`}
    >
      {/* CARD */}
      <div className="w-full max-w-md backdrop-blur-xl bg-white/90 border border-white/20 shadow-2xl rounded-2xl p-8">
        
        {/* header */}
        <div className="text-center mb-6">
          <div className="mx-auto mb-3 w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center text-white text-xl font-bold shadow-lg">
            +
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Crear Usuario</h1>
          <p className="text-sm text-gray-500">Registrar nuevo miembro del sistema</p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <input
            type="text"
            name="name"
            placeholder="Nombre"
            value={form.name}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            required
          />
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={form.email}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            required
          />
          <input
            type="text"
            name="username"
            placeholder="Username"
            value={form.username}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            required
          />
          <input
            type="password"
            name="password"
            placeholder="Contraseña"
            value={form.password}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            required
          />

          <select
            name="role"
            value={form.role}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="trabajador">Trabajador</option>
            <option value="admin">Admin</option>
          </select>

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition transform hover:scale-[1.02] shadow-lg"
          >
            Crear Usuario
          </button>

          {error && (
            <p className="text-red-500 text-sm text-center mt-2">{error}</p>
          )}
        </form>
      </div>
    </div>
  </div>
);
}
