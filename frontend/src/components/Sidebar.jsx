import { useNavigate } from "react-router-dom";

export default function Sidebar({ menuOpen, setMenuOpen, role }) {
  const navigate = useNavigate();
  const isAdmin = role === "admin";
  const isWorker = role === "worker";

  const handleNavigate = (path) => {
    navigate(path);
    setMenuOpen(false);
  };

  return (
    <div
      className={`fixed top-0 left-0 h-full w-64 bg-blue-700 text-white z-50 transform transition-transform duration-300 ${
        menuOpen ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-6">Sistema de Cobros</h2>
        <ul className="space-y-4">
          <li
            className="cursor-pointer hover:bg-blue-600 p-2 rounded"
            onClick={() => handleNavigate("/dashboard")}
          >
            Dashboard
          </li>
          <li
            className="cursor-pointer hover:bg-blue-600 p-2 rounded"
            onClick={() => handleNavigate("/clientes")}
          >
            Ver Clientes
          </li>
          <li
            className="cursor-pointer hover:bg-blue-600 p-2 rounded"
            onClick={() => handleNavigate("/cobros")}
          >
            Registrar Cobro
          </li>

          {isAdmin && (
            <>
              <li
                className="cursor-pointer hover:bg-blue-600 p-2 rounded"
                onClick={() => handleNavigate("/usuarios/crear")}
              >
                Crear Usuario
              </li>
              <li
                className="cursor-pointer hover:bg-blue-600 p-2 rounded"
                onClick={() => handleNavigate("/usuarios")}
              >
                Gestionar Usuarios
              </li>
              <li
                className="cursor-pointer hover:bg-blue-600 p-2 rounded"
                onClick={() => handleNavigate("/reportes")}
              >
                Reportes
              </li>
            </>
          )}

          {isWorker && (
            <li className="text-sm opacity-80 mt-4">
              Acceso limitado a funciones administrativas.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
