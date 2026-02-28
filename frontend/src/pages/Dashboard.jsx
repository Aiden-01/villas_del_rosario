import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));

  return (
    <div className="pt-16 text-[var(--text)]">
      {/* BIENVENIDA */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">
          Bienvenido, {user?.username || "Usuario"}
        </h1>
        <p className="opacity-70">Panel principal del sistema de préstamos</p>
      </div>

      {/* ACCIONES RÁPIDAS */}
      <div
        className="p-6 rounded-xl shadow-sm mb-6"
        style={{ backgroundColor: "var(--card)", border: "1px solid var(--card-border)" }}
      >
        <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--secondary)" }}>
          Acciones rápidas
        </h2>

        <div className="flex flex-wrap gap-4">
          <button
            onClick={() => navigate("/prestamos/crear")}
            className="text-white px-4 py-2 rounded-lg shadow transition hover:scale-105 hover:opacity-90"
            style={{ backgroundColor: "var(--secondary)" }}
          >
            + Nuevo Préstamo
          </button>

          <button
            onClick={() => navigate("/clientes/crear")}
            className="text-white px-4 py-2 rounded-lg shadow transition hover:scale-105 hover:opacity-90"
            style={{ backgroundColor: "var(--primary)" }}
          >
            + Crear Cliente
          </button>
        </div>
      </div>

      {/* RESUMEN RÁPIDO */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          className="p-5 rounded-xl shadow text-center cursor-pointer hover:scale-105 transition"
          style={{ backgroundColor: "var(--card)", border: "1px solid var(--card-border)" }}
          onClick={() => navigate("/clientes")}
        >
          <p className="text-3xl font-bold" style={{ color: "var(--primary)" }}>👥</p>
          <p className="font-semibold mt-2">Clientes</p>
          <p className="text-sm opacity-60">Ver todos los clientes</p>
        </div>

        <div
          className="p-5 rounded-xl shadow text-center cursor-pointer hover:scale-105 transition"
          style={{ backgroundColor: "var(--card)", border: "1px solid var(--card-border)" }}
          onClick={() => navigate("/prestamos")}
        >
          <p className="text-3xl font-bold" style={{ color: "var(--secondary)" }}>💰</p>
          <p className="font-semibold mt-2">Préstamos</p>
          <p className="text-sm opacity-60">Ver todos los préstamos</p>
        </div>

        <div
          className="p-5 rounded-xl shadow text-center cursor-pointer hover:scale-105 transition"
          style={{ backgroundColor: "var(--card)", border: "1px solid var(--card-border)" }}
          onClick={() => navigate("/cobros")}
        >
          <p className="text-3xl font-bold" style={{ color: "var(--primary)" }}>📋</p>
          <p className="font-semibold mt-2">Cobros</p>
          <p className="text-sm opacity-60">Registrar pagos</p>
        </div>
      </div>
    </div>
  );
}