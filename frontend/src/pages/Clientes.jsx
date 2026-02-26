import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import { useNavigate } from "react-router-dom";

export const ROUTES = {
  CLIENTS: "http://localhost:3333/api/clientes",
};

export default function Clientes() {
  const user = JSON.parse(localStorage.getItem("user"));
  const [menuOpen, setMenuOpen] = useState(false);
  const [clientes, setClientes] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchClientes = async () => {
    try {
      const token = localStorage.getItem("token");

      const res = await fetch(ROUTES.CLIENTS, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Error cargando clientes");
        return;
      }

      setClientes(data);
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

  const handleDelete = async (id) => {
    if (!window.confirm("¿Seguro que deseas eliminar este cliente?")) return;

    try {
      const token = localStorage.getItem("token");

      const res = await fetch(`${ROUTES.CLIENTS}/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "No se pudo eliminar");
        return;
      }

      fetchClientes();
    } catch (err) {
      console.error(err);
      alert("Error eliminando cliente");
    }
  };

  return (
    <div className="relative min-h-screen bg-[var(--bg)] text-[var(--text)] transition-colors">
      <Sidebar menuOpen={menuOpen} setMenuOpen={setMenuOpen} role={user?.role} />

      <button
        className="p-2 m-4 rounded-lg bg-[var(--secondary)] text-white fixed top-0 left-0 z-50 shadow"
        onClick={() => setMenuOpen(!menuOpen)}
      >
        ☰
      </button>

      <div
        className={`transition-transform duration-300 ${
          menuOpen ? "translate-x-64" : "translate-x-0"
        } p-8 pt-24`}
      >
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Clientes</h1>

          {/* CREAR → TODOS */}
          <button
            onClick={() => navigate("/clientes/crear")}
            className="bg-[var(--primary)] text-white px-4 py-2 rounded-lg shadow hover:opacity-90"
          >
            + Crear Cliente
          </button>
        </div>

        {loading && <p>Cargando clientes...</p>}
        {error && <p className="text-red-500">{error}</p>}

        {!loading && clientes.length === 0 && (
          <p>No hay clientes registrados.</p>
        )}

        {!loading && clientes.length > 0 && (
          <div className="overflow-x-auto bg-[var(--card)] rounded-xl shadow">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[var(--secondary)] text-white">
                <tr>
                  <th className="p-3">DPI</th>
                  <th className="p-3">Nombre</th>
                  <th className="p-3">Teléfono</th>
                  <th className="p-3">Dirección</th>
                  <th className="p-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {clientes.map((cliente) => (
                  <tr
                    key={cliente.id}
                    className="border-b border-gray-200 dark:border-gray-700"
                  >
                    <td className="p-3">{cliente.dpi}</td>
                    <td className="p-3">
                      {cliente.nombres} {cliente.apellidos}
                    </td>
                    <td className="p-3">{cliente.telefono}</td>
                    <td className="p-3">{cliente.direccion}</td>
                    <td className="p-3 text-center space-x-2">

                      {/* EDITAR → TODOS */}
                      <button
                        className="px-3 py-1 bg-blue-500 text-white rounded hover:opacity-90"
                        onClick={() =>
                          navigate(`/clientes/editar/${cliente.id}`)
                        }
                      >
                        Editar
                      </button>

                      {/* ELIMINAR → SOLO ADMIN */}
                      {user?.role === "admin" && (
                        <button
                          className="px-3 py-1 bg-red-500 text-white rounded hover:opacity-90"
                          onClick={() => handleDelete(cliente.id)}
                        >
                          Eliminar
                        </button>
                      )}

                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}