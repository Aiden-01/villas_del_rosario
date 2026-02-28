import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Toast from "../components/Toast";
import useToast from "../hooks/useToast";

const ROUTES = {
  USERS: "http://localhost:3333/api/users",
};

export default function CrearUsuario() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    username: "",
    password: "",
    role: "trabajador",
  });
  const { toast, showToast, closeToast } = useToast();
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
      showToast("Usuario creado correctamente", "success");
      setTimeout(() => navigate("/GestionUsuarios"), 1500);
    } catch {
      showToast("Error al crear el usuario", "error");
    }
  };

  return (
    <>
      <div className="pt-16 flex justify-center items-start px-4">
        <div
          className="w-full max-w-md shadow-lg rounded-2xl p-8"
          style={{
            backgroundColor: "var(--card)",
            border: "1px solid var(--card-border)",
          }}
        >
          <div className="text-center mb-6">
            <div
              className="mx-auto mb-3 w-14 h-14 rounded-xl flex items-center justify-center text-white text-xl font-bold shadow"
              style={{ backgroundColor: "var(--secondary)" }}
            >
              +
            </div>
            <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>
              Crear Usuario
            </h1>
            <p className="text-sm opacity-70">
              Registrar nuevo miembro del sistema
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <input
              type="text"
              name="name"
              placeholder="Nombre"
              value={form.name}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded-lg outline-none focus:ring-2"
              style={{
                backgroundColor: "var(--bg)",
                color: "var(--text)",
                border: "1px solid var(--card-border)",
              }}
              required
            />
            <input
              type="email"
              name="email"
              placeholder="Email"
              value={form.email}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded-lg outline-none focus:ring-2"
              style={{
                backgroundColor: "var(--bg)",
                color: "var(--text)",
                border: "1px solid var(--card-border)",
              }}
              required
            />
            <input
              type="text"
              name="username"
              placeholder="Username"
              value={form.username}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded-lg outline-none focus:ring-2"
              style={{
                backgroundColor: "var(--bg)",
                color: "var(--text)",
                border: "1px solid var(--card-border)",
              }}
              required
            />
            <input
              type="password"
              name="password"
              placeholder="Contraseña"
              value={form.password}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded-lg outline-none focus:ring-2"
              style={{
                backgroundColor: "var(--bg)",
                color: "var(--text)",
                border: "1px solid var(--card-border)",
              }}
              required
            />
            <select
              name="role"
              value={form.role}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded-lg outline-none focus:ring-2"
              style={{
                backgroundColor: "var(--bg)",
                color: "var(--text)",
                border: "1px solid var(--card-border)",
              }}
            >
              <option value="trabajador">Trabajador</option>
              <option value="admin">Admin</option>
            </select>

            <button
              type="submit"
              className="w-full text-white py-2 rounded-lg transition hover:scale-105 hover:opacity-90 shadow"
              style={{ backgroundColor: "var(--primary)" }}
            >
              Crear Usuario
            </button>

            {error && (
              <p className="text-red-500 text-sm text-center mt-2">{error}</p>
            )}
          </form>
        </div>
      </div>

      {/* 👇 FUERA de todo */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={closeToast} />}
    </>
  );
}