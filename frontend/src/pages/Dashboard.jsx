import { useNavigate } from "react-router-dom";
import { Users, HandCoins, Plus, FileBarChart2, CalendarDays } from "lucide-react";

export default function Dashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));
  const isAdmin = user?.role === "admin";

  return (
    <div className="pt-16 text-[var(--text)]">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">
          Bienvenido, {user?.username || "Usuario"}
        </h1>
        <p className="opacity-70">Panel principal del sistema de lotificaciones</p>
        <p className="opacity-70">Control de clientes, ventas y pagos</p>
        <p className="opacity-70">Villas del Rosario</p>
      </div>

      <div
        className="p-6 rounded-xl shadow-sm mb-6"
        style={{ backgroundColor: "var(--card)", border: "1px solid var(--card-border)" }}
      >
        <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--secondary)" }}>
          Acciones rapidas
        </h2>

        <div className="flex flex-wrap gap-4">
          <button
            onClick={() => navigate("/ventas/crear")}
            className="flex items-center gap-2 text-white px-4 py-2 rounded-lg shadow transition hover:scale-105 hover:opacity-90"
            style={{ backgroundColor: "var(--secondary)" }}
          >
            <Plus size={16} />
            Nueva Venta
          </button>

          <button
            onClick={() => navigate("/clientes/crear")}
            className="flex items-center gap-2 text-white px-4 py-2 rounded-lg shadow transition hover:scale-105 hover:opacity-90"
            style={{ backgroundColor: "var(--primary)" }}
          >
            <Plus size={16} />
            Crear Cliente
          </button>

          {isAdmin && (
            <button
              onClick={() => navigate("/reportes")}
              className="flex items-center gap-2 text-white px-4 py-2 rounded-lg shadow transition hover:scale-105 hover:opacity-90"
              style={{ backgroundColor: "#0f766e" }}
            >
              <FileBarChart2 size={16} />
              Ver Reportes
            </button>
          )}

          <button
            onClick={() => navigate("/pagos")}
            className="flex items-center gap-2 text-white px-4 py-2 rounded-lg shadow transition hover:scale-105 hover:opacity-90"
            style={{ backgroundColor: "#0f766e" }}
          >
            <CalendarDays size={16} />
            Agenda de Pagos
          </button>
        </div>
      </div>

      <div className={`grid grid-cols-1 gap-4 ${isAdmin ? "sm:grid-cols-4" : "sm:grid-cols-3"}`}>
        <div
          className="p-5 rounded-xl shadow text-center cursor-pointer hover:scale-105 transition"
          style={{ backgroundColor: "var(--card)", border: "1px solid var(--card-border)" }}
          onClick={() => navigate("/clientes")}
        >
          <div className="flex justify-center mb-2">
            <Users size={32} style={{ color: "var(--primary)" }} />
          </div>
          <p className="font-semibold mt-2">Clientes</p>
          <p className="text-sm opacity-60">Ver todos los clientes</p>
        </div>

        <div
          className="p-5 rounded-xl shadow text-center cursor-pointer hover:scale-105 transition"
          style={{ backgroundColor: "var(--card)", border: "1px solid var(--card-border)" }}
          onClick={() => navigate("/ventas")}
        >
          <div className="flex justify-center mb-2">
            <HandCoins size={32} style={{ color: "var(--secondary)" }} />
          </div>
          <p className="font-semibold mt-2">Ventas</p>
          <p className="text-sm opacity-60">Ver todas las ventas y sus cuotas</p>
        </div>

        <div
          className="p-5 rounded-xl shadow text-center cursor-pointer hover:scale-105 transition"
          style={{ backgroundColor: "var(--card)", border: "1px solid var(--card-border)" }}
          onClick={() => navigate("/pagos")}
        >
          <div className="flex justify-center mb-2">
            <CalendarDays size={32} style={{ color: "#0f766e" }} />
          </div>
          <p className="font-semibold mt-2">Pagos</p>
          <p className="text-sm opacity-60">Ver agenda de cobros y reprogramaciones</p>
        </div>

        {isAdmin && (
          <div
            className="p-5 rounded-xl shadow text-center cursor-pointer hover:scale-105 transition"
            style={{ backgroundColor: "var(--card)", border: "1px solid var(--card-border)" }}
            onClick={() => navigate("/reportes")}
          >
            <div className="flex justify-center mb-2">
              <FileBarChart2 size={32} style={{ color: "#0f766e" }} />
            </div>
            <p className="font-semibold mt-2">Reportes</p>
            <p className="text-sm opacity-60">Resumen de cartera y pagos</p>
          </div>
        )}
      </div>
    </div>
  );
}
