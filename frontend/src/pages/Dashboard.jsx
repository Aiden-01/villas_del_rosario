import { useNavigate } from "react-router-dom";
import { Users, HandCoins, MapPin, Map, Plus } from "lucide-react";

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
        <p className="opacity-70">Panel principal del sistema de cobros</p>
        <p className="opacity-70">Villas del Rosario</p>
      </div>

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

          <button
            onClick={() => navigate("/ruta-del-dia")}
            className="flex items-center gap-2 text-white px-4 py-2 rounded-lg shadow transition hover:scale-105 hover:opacity-90"
            style={{ backgroundColor: "#16a34a" }}
          >
            <MapPin size={16} />
            Ruta de Hoy
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
          onClick={() => navigate("/prestamos")}
        >
          <div className="flex justify-center mb-2">
            <HandCoins size={32} style={{ color: "var(--secondary)" }} />
          </div>
          <p className="font-semibold mt-2">Ventas</p>
          <p className="text-sm opacity-60">Ver todos los financiamientos</p>
        </div>

        <div
          className="p-5 rounded-xl shadow text-center cursor-pointer hover:scale-105 transition"
          style={{ backgroundColor: "var(--card)", border: "1px solid var(--card-border)" }}
          onClick={() => navigate("/ruta-del-dia")}
        >
          <div className="flex justify-center mb-2">
            <MapPin size={32} style={{ color: "#16a34a" }} />
          </div>
          <p className="font-semibold mt-2">Ruta de Hoy</p>
          <p className="text-sm opacity-60">Ver cobros del día</p>
        </div>

        {isAdmin && (
          <div
            className="p-5 rounded-xl shadow text-center cursor-pointer hover:scale-105 transition"
            style={{ backgroundColor: "var(--card)", border: "1px solid var(--card-border)" }}
            onClick={() => navigate("/rutas")}
          >
            <div className="flex justify-center mb-2">
              <Map size={32} style={{ color: "var(--secondary)" }} />
            </div>
            <p className="font-semibold mt-2">Rutas</p>
            <p className="text-sm opacity-60">Gestionar rutas de cobro</p>
          </div>
        )}
      </div>
    </div>
  );
}
