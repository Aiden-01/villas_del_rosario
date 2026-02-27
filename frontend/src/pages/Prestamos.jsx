import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

const ROUTES = {
  PRESTAMOS: "http://localhost:3333/api/prestamos",
  CLIENTES: "http://localhost:3333/api/clientes",
};

const ESTADO_COLORS = {
  activo: "bg-green-100 text-green-700",
  pagado: "bg-blue-100 text-blue-700",
  vencido: "bg-red-100 text-red-700",
};

// Si fecha_fin ya pasó y el estado es activo → mora
const esMora = (prestamo) => {
  if (prestamo.estado !== "activo") return false;
  const hoy = new Date();
  const fin = new Date(prestamo.fechaFin);
  return fin < hoy;
};

const calcularCuotaSemanal = (monto, interes, cuotas) => {
  const total = Number(monto) * (1 + Number(interes) / 100);
  return total / Number(cuotas);
};

export default function Prestamos() {
  const user = JSON.parse(localStorage.getItem("user"));
  const [prestamos, setPrestamos] = useState([]);
  const [clienteNombre, setClienteNombre] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedPrestamo, setSelectedPrestamo] = useState(null);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const clienteId = searchParams.get("clienteId");

  const fetchPrestamos = async () => {
    try {
      const token = localStorage.getItem("token");
      const url = clienteId
        ? `${ROUTES.PRESTAMOS}/cliente/${clienteId}`
        : ROUTES.PRESTAMOS;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Error cargando préstamos");
        return;
      }
      setPrestamos(data);

      if (clienteId) {
        const resCliente = await fetch(`${ROUTES.CLIENTES}/${clienteId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const dataCliente = await resCliente.json();
        setClienteNombre(`${dataCliente.nombres} ${dataCliente.apellidos}`);
      }
    } catch (err) {
      console.error(err);
      setError("No se pudo conectar con el servidor");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrestamos();
  }, [clienteId]);

  const handleDelete = async (id) => {
    if (!window.confirm("¿Seguro que deseas eliminar este préstamo?")) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${ROUTES.PRESTAMOS}/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.message || "No se pudo eliminar");
        return;
      }
      setSelectedPrestamo(null);
      fetchPrestamos();
    } catch (err) {
      console.error(err);
      alert("Error eliminando préstamo");
    }
  };

  return (
    <div className="pt-16 text-[var(--text)]">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Préstamos</h1>
          {clienteNombre && (
            <p className="text-sm text-gray-400 mt-1">
              Filtrando por:{" "}
              <span className="font-semibold text-[var(--primary)]">{clienteNombre}</span>
              <button
                onClick={() => navigate("/prestamos")}
                className="ml-2 text-xs text-red-400 hover:underline"
              >
                (ver todos)
              </button>
            </p>
          )}
        </div>
        <button
          onClick={() =>
            navigate(clienteId ? `/prestamos/crear?clienteId=${clienteId}` : "/prestamos/crear")
          }
          className="bg-[var(--primary)] text-white px-4 py-2 rounded-lg shadow hover:opacity-90"
        >
          + Crear Préstamo
        </button>
      </div>

      {loading && <p>Cargando préstamos...</p>}
      {error && <p className="text-red-500">{error}</p>}
      {!loading && prestamos.length === 0 && <p>No se encontraron préstamos.</p>}

      {/* GRID */}
      {!loading && prestamos.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {prestamos.map((prestamo) => {
            const mora = esMora(prestamo);
            const cuotaSemanal = calcularCuotaSemanal(
              prestamo.monto,
              prestamo.interes,
              prestamo.cuotas
            );

            return (
              <div
                key={prestamo.id}
                onClick={() => setSelectedPrestamo(prestamo)}
                className="rounded-2xl shadow-md p-5 cursor-pointer hover:scale-105 hover:shadow-xl transition-all duration-200"
                style={{
                  backgroundColor: "var(--card)",
                  border: mora ? "2px solid #ef4444" : "2px solid transparent",
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-bold text-base">
                    {prestamo.cliente?.nombres} {prestamo.cliente?.apellidos}
                  </h2>
                  <span
                    className={`text-xs px-2 py-1 rounded-full font-semibold ${
                      mora
                        ? "bg-red-100 text-red-700"
                        : ESTADO_COLORS[prestamo.estado] || "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {mora ? "⚠ mora" : prestamo.estado}
                  </span>
                </div>

                <div className="space-y-1 text-sm text-gray-500">
                  <p><span className="font-medium text-[var(--text)]">Monto:</span> Q{Number(prestamo.monto).toLocaleString()}</p>
                  <p><span className="font-medium text-[var(--text)]">Interés:</span> {prestamo.interes}%</p>
                  <p><span className="font-medium text-[var(--text)]">Cuotas:</span> {prestamo.cuotas} semanas</p>
                  <p>
                    <span className="font-medium text-[var(--text)]">Cuota semanal:</span>{" "}
                    <span className="font-bold" style={{ color: "var(--primary)" }}>
                      Q{cuotaSemanal.toLocaleString("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </p>
                  <p><span className="font-medium text-[var(--text)]">Inicio:</span> {prestamo.fechaInicio?.split("T")[0]}</p>
                  <p><span className="font-medium text-[var(--text)]">Fin:</span> {prestamo.fechaFin?.split("T")[0]}</p>
                </div>

                {/* Barra de progreso de tiempo */}
                {prestamo.estado === "activo" && (
                  <div className="mt-3">
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full transition-all"
                        style={{
                          width: `${Math.min(
                            100,
                            ((new Date() - new Date(prestamo.fechaInicio)) /
                              (new Date(prestamo.fechaFin) - new Date(prestamo.fechaInicio))) *
                              100
                          )}%`,
                          backgroundColor: mora ? "#ef4444" : "var(--primary)",
                        }}
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-1 text-right">
                      {mora
                        ? "⚠ Plazo vencido"
                        : `${Math.round(
                            ((new Date() - new Date(prestamo.fechaInicio)) /
                              (new Date(prestamo.fechaFin) - new Date(prestamo.fechaInicio))) *
                              100
                          )}% del plazo`}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL */}
      {selectedPrestamo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setSelectedPrestamo(null)}
        >
          <div
            className="bg-[var(--card)] rounded-3xl shadow-2xl p-8 w-full max-w-sm mx-4"
            onClick={(e) => e.stopPropagation()}
            style={{
              animation: "zoomIn 0.2s ease-out",
              border: esMora(selectedPrestamo) ? "2px solid #ef4444" : "none",
            }}
          >
            <div className="flex justify-center mb-4">
              <span
                className={`text-sm px-4 py-1 rounded-full font-semibold ${
                  esMora(selectedPrestamo)
                    ? "bg-red-100 text-red-700"
                    : ESTADO_COLORS[selectedPrestamo.estado] || "bg-gray-100 text-gray-600"
                }`}
              >
                {esMora(selectedPrestamo) ? "⚠ En mora" : selectedPrestamo.estado}
              </span>
            </div>

            <h2 className="text-xl font-bold text-center mb-1">
              {selectedPrestamo.cliente?.nombres} {selectedPrestamo.cliente?.apellidos}
            </h2>
            <p className="text-center text-2xl font-bold mb-5" style={{ color: "var(--primary)" }}>
              Q{Number(selectedPrestamo.monto).toLocaleString()}
            </p>

            <div className="space-y-2 text-sm mb-6 bg-[var(--bg)] rounded-xl p-4">
              <p><span className="font-semibold">Interés:</span> {selectedPrestamo.interes}%</p>
              <p><span className="font-semibold">Cuotas:</span> {selectedPrestamo.cuotas} semanas</p>
              <p><span className="font-semibold">Fecha inicio:</span> {selectedPrestamo.fechaInicio?.split("T")[0]}</p>
              <p><span className="font-semibold">Fecha fin:</span> {selectedPrestamo.fechaFin?.split("T")[0]}</p>

              <hr style={{ borderColor: "var(--card-border)" }} />

              <p>
                <span className="font-semibold">Total a pagar:</span>{" "}
                Q{(Number(selectedPrestamo.monto) * (1 + Number(selectedPrestamo.interes) / 100)).toLocaleString("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="font-bold text-base" style={{ color: "var(--primary)" }}>
                Cuota semanal:{" "}
                Q{calcularCuotaSemanal(
                  selectedPrestamo.monto,
                  selectedPrestamo.interes,
                  selectedPrestamo.cuotas
                ).toLocaleString("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={() => navigate(`/prestamos/editar/${selectedPrestamo.id}`)}
                className="w-full py-2 bg-blue-500 text-white rounded-xl font-semibold hover:opacity-90"
              >
                Editar Préstamo
              </button>
              {user?.role === "admin" && (
                <button
                  onClick={() => handleDelete(selectedPrestamo.id)}
                  className="w-full py-2 bg-red-500 text-white rounded-xl font-semibold hover:opacity-90"
                >
                  Eliminar Préstamo
                </button>
              )}
              <button
                onClick={() => setSelectedPrestamo(null)}
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
    </div>
  );
}