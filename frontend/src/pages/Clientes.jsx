import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Toast from "../components/Toast";
import useToast from "../hooks/useToast";
import { authFetch } from "../services/api";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3333";

const ROUTES = {
  CLIENTS: `${API_URL}/api/clientes`,
};

export default function Clientes() {
  const user = JSON.parse(localStorage.getItem("user"));
  const [clientes, setClientes] = useState([]);
  const [filteredClientes, setFilteredClientes] = useState([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedCliente, setSelectedCliente] = useState(null);
  const { toast, showToast, closeToast } = useToast();

  const navigate = useNavigate();

  const fetchClientes = async () => {
    try {
      const res = await authFetch(ROUTES.CLIENTS);
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Error cargando clientes");
        return;
      }
      setClientes(data);
      setFilteredClientes(data);
    } catch (err) {
      console.error(err);
      setError("No se pudo conectar con el servidor");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClientes();
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!search.trim()) {
        setFilteredClientes(clientes);
        return;
      }
      const term = search.toLowerCase();
      const results = clientes.filter((cliente) => {
        const fullName = `${cliente.nombres} ${cliente.apellidos}`.toLowerCase();
        return (
          fullName.includes(term) ||
          (cliente.telefono || "").toLowerCase().includes(term) ||
          (cliente.direccion || "").toLowerCase().includes(term)
        );
      });
      setFilteredClientes(results);
    }, 400);
    return () => clearTimeout(timeout);
  }, [search, clientes]);

  const handleDelete = async (id) => {
    if (!window.confirm("¿Seguro que deseas eliminar este cliente?")) return;
    try {
      const res = await authFetch(`${ROUTES.CLIENTS}/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.message || "No se pudo eliminar", "error");
        return;
      }
      setSelectedCliente(null);
      fetchClientes();
      showToast("Cliente eliminado correctamente", "success");
    } catch (err) {
      console.error(err);
      showToast("Error eliminando cliente", "error");
    }
  };

  const getInitials = (nombres, apellidos) => {
    const n = nombres?.charAt(0).toUpperCase() || "";
    const a = apellidos?.charAt(0).toUpperCase() || "";
    return `${n}${a}`;
  };

  return (
    <div className="pt-16 text-[var(--text)]">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold">Clientes</h1>
        <button
          onClick={() => navigate("/clientes/crear")}
          className="bg-[var(--primary)] text-white px-4 py-2 rounded-lg shadow hover:opacity-90"
        >
          + Crear Cliente
        </button>
      </div>

      <div className="mb-6">
        <input
          type="text"
          placeholder="Buscar por nombre, teléfono o dirección..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-2 rounded-lg bg-[var(--card)] border border-gray-300 focus:outline-none"
        />
      </div>

      {loading && <p>Cargando clientes...</p>}
      {error && <p className="text-red-500">{error}</p>}
      {!loading && filteredClientes.length === 0 && <p>No se encontraron clientes.</p>}

      {!loading && filteredClientes.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredClientes.map((cliente) => (
            <div
              key={cliente.id}
              onClick={() => setSelectedCliente(cliente)}
              className="bg-[var(--card)] rounded-2xl shadow-md p-5 cursor-pointer hover:scale-105 hover:shadow-xl transition-all duration-200"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-[var(--primary)] flex items-center justify-center text-white font-bold text-lg shrink-0">
                  {getInitials(cliente.nombres, cliente.apellidos)}
                </div>
                <div>
                  <h2 className="font-bold text-base leading-tight">
                    {cliente.nombres} {cliente.apellidos}
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">Cliente</p>
                </div>
              </div>
              <div className="space-y-1 text-sm text-gray-500">
                <p><span className="font-medium text-[var(--text)]">Tel:</span> {cliente.telefono}</p>
                <p><span className="font-medium text-[var(--text)]">Dir:</span> {cliente.direccion}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedCliente && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setSelectedCliente(null)}
        >
          <div
            className="bg-[var(--card)] rounded-3xl shadow-2xl p-8 w-full max-w-sm mx-4"
            onClick={(e) => e.stopPropagation()}
            style={{ animation: "zoomIn 0.2s ease-out" }}
          >
            <div className="flex flex-col items-center mb-6">
              <div className="w-20 h-20 rounded-full bg-[var(--primary)] flex items-center justify-center text-white font-bold text-3xl mb-3">
                {getInitials(selectedCliente.nombres, selectedCliente.apellidos)}
              </div>
              <h2 className="text-xl font-bold text-center">
                {selectedCliente.nombres} {selectedCliente.apellidos}
              </h2>
              <p className="text-sm text-gray-400">Cliente</p>
            </div>

            <div className="space-y-2 text-sm mb-6 bg-[var(--bg)] rounded-xl p-4">
              <p><span className="font-semibold">Teléfono:</span> {selectedCliente.telefono}</p>
              <p><span className="font-semibold">Dirección:</span> {selectedCliente.direccion}</p>
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={() => navigate(`/ventas/crear?clienteId=${selectedCliente.id}`)}
                className="w-full py-2 bg-green-500 text-white rounded-xl font-semibold hover:opacity-90"
              >
                + Crear Venta
              </button>
              <button
                onClick={() => navigate(`/ventas?clienteId=${selectedCliente.id}`)}
                className="w-full py-2 bg-[var(--secondary)] text-white rounded-xl font-semibold hover:opacity-90"
              >
                Ver Ventas
              </button>
              <button
                onClick={() => navigate(`/clientes/${selectedCliente.id}/estado-cuenta`)}
                className="w-full py-2 bg-slate-700 text-white rounded-xl font-semibold hover:opacity-90"
              >
                Estado de Cuenta
              </button>
              <button
                onClick={() => navigate(`/clientes/editar/${selectedCliente.id}`)}
                className="w-full py-2 bg-blue-500 text-white rounded-xl font-semibold hover:opacity-90"
              >
                Editar Cliente
              </button>
              {user?.role === "admin" && (
                <button
                  onClick={() => handleDelete(selectedCliente.id)}
                  className="w-full py-2 bg-red-500 text-white rounded-xl font-semibold hover:opacity-90"
                >
                  Eliminar Cliente
                </button>
              )}
              <button
                onClick={() => setSelectedCliente(null)}
                className="w-full py-2 bg-gray-300 text-gray-800 rounded-xl font-semibold hover:opacity-90 mt-1"
              >
                Cerrar
              </button>
            </div>
          </div>
          <style>{`
            @keyframes zoomIn {
              from { opacity: 0; transform: scale(0.85); }
              to   { opacity: 1; transform: scale(1); }
            }
          `}</style>
        </div>
      )}
      {toast && <Toast message={toast.message} type={toast.type} onClose={closeToast} />}
    </div>
  );
}
