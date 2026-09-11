import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Toast from "../components/Toast";
import useToast from "../hooks/useToast";
import { API_URL, authFetch } from "../services/api";

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
    if (!window.confirm("¿Seguro que deseas desactivar este cliente? El historial se conservará.")) return;
    try {
      const res = await authFetch(`${ROUTES.CLIENTS}/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.message || "No se pudo desactivar", "error");
        return;
      }
      setSelectedCliente(null);
      fetchClientes();
      showToast("Cliente desactivado correctamente", "success");
    } catch (err) {
      console.error(err);
      showToast("Error desactivando cliente", "error");
    }
  };

  const getInitials = (nombres, apellidos) => {
    const n = nombres?.charAt(0).toUpperCase() || "";
    const a = apellidos?.charAt(0).toUpperCase() || "";
    return `${n}${a}`;
  };

  return (
    <div className="min-w-0 text-[var(--text)]">
      <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold sm:text-2xl">Clientes</h1>
        <button
          onClick={() => navigate("/clientes/crear")}
          className="w-full rounded-lg bg-[var(--primary)] px-4 py-2 text-white shadow hover:opacity-90 sm:w-auto"
        >
          + Crear Cliente
        </button>
      </div>

      <div className="mb-4 sm:mb-6">
        <input
          type="text"
          placeholder="Buscar por nombre, teléfono o dirección..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full min-w-0 rounded-lg border border-gray-300 bg-[var(--card)] px-3 py-2 focus:outline-none sm:px-4"
        />
      </div>

      {loading && <p>Cargando clientes...</p>}
      {error && <p className="text-red-500">{error}</p>}
      {!loading && filteredClientes.length === 0 && <p>No se encontraron clientes.</p>}

      {!loading && filteredClientes.length > 0 && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {filteredClientes.map((cliente) => (
            <div
              key={cliente.id}
              onClick={() => setSelectedCliente(cliente)}
              className="min-w-0 cursor-pointer rounded-2xl bg-[var(--card)] p-4 shadow-md transition-all duration-200 hover:shadow-xl md:hover:scale-[1.02] sm:p-5"
            >
              <div className="mb-3 flex min-w-0 items-center gap-3 sm:mb-4 sm:gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-base font-bold text-white sm:h-12 sm:w-12 sm:text-lg">
                  {getInitials(cliente.nombres, cliente.apellidos)}
                </div>
                <div className="min-w-0">
                  <h2 className="break-words text-base font-bold leading-tight">
                    {cliente.nombres} {cliente.apellidos}
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">Cliente</p>
                </div>
              </div>
              <div className="min-w-0 space-y-1 text-sm text-gray-500">
                <p className="break-words"><span className="font-medium text-[var(--text)]">Tel:</span> {cliente.telefono}</p>
                <p className="break-words"><span className="font-medium text-[var(--text)]">Dir:</span> {cliente.direccion}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedCliente && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-2 backdrop-blur-sm sm:p-4"
          onClick={() => setSelectedCliente(null)}
        >
          <div
            className="max-h-[calc(100dvh-1rem)] w-full max-w-sm overflow-y-auto rounded-2xl bg-[var(--card)] p-4 shadow-2xl sm:max-h-[calc(100dvh-2rem)] sm:rounded-3xl sm:p-8"
            onClick={(e) => e.stopPropagation()}
            style={{ animation: "zoomIn 0.2s ease-out" }}
          >
            <div className="mb-4 flex min-w-0 flex-col items-center sm:mb-6">
              <div className="mb-3 flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-2xl font-bold text-white sm:h-20 sm:w-20 sm:text-3xl">
                {getInitials(selectedCliente.nombres, selectedCliente.apellidos)}
              </div>
              <h2 className="max-w-full break-words text-center text-xl font-bold">
                {selectedCliente.nombres} {selectedCliente.apellidos}
              </h2>
              <p className="text-sm text-gray-400">Cliente</p>
            </div>

            <div className="mb-4 min-w-0 space-y-2 rounded-xl bg-[var(--bg)] p-3 text-sm sm:mb-6 sm:p-4">
              <p className="break-words"><span className="font-semibold">Teléfono:</span> {selectedCliente.telefono}</p>
              <p className="break-words"><span className="font-semibold">Dirección:</span> {selectedCliente.direccion}</p>
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
                  Desactivar Cliente
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
