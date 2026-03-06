import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Toast from "../components/Toast";
import useToast from "../hooks/useToast";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3333";

const ROUTES = {
  PRESTAMOS: API = `${API_URL}/api/prestamos`,
  CLIENTES: API = `${API_URL}/api/clientes`,
  PAGOS: API = `${API_URL}/api/pagos`,
};

const ESTADO_COLORS = {
  activo: "bg-green-100 text-green-700",
  pagado: "bg-blue-100 text-blue-700",
  vencido: "bg-red-100 text-red-700",
};

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

const formatearFecha = (fecha) => {
  if (!fecha) return "";
  const [year, month, day] = fecha.split("T")[0].split("-");
  return `${day}-${month}-${year}`;
};

export default function Prestamos() {
  const user = JSON.parse(localStorage.getItem("user"));
  const [prestamos, setPrestamos] = useState([]);
  const [clienteNombre, setClienteNombre] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedPrestamo, setSelectedPrestamo] = useState(null);
  const [pagos, setPagos] = useState([]);
  const [loadingPagos, setLoadingPagos] = useState(false);
  const [registrandoPago, setRegistrandoPago] = useState(false);
  const { toast, showToast, closeToast } = useToast();

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

  const fetchPagos = async (prestamoId) => {
    setLoadingPagos(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${ROUTES.PAGOS}/prestamo/${prestamoId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) setPagos(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingPagos(false);
    }
  };

  useEffect(() => {
    fetchPrestamos();
  }, [clienteId]);

  const abrirModal = (prestamo) => {
    setSelectedPrestamo(prestamo);
    setPagos([]);
    fetchPagos(prestamo.id);
  };

  const cerrarModal = () => {
    setSelectedPrestamo(null);
    setPagos([]);
  };

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
        showToast(data.message || "No se pudo eliminar", "error");
        return;
      }
      cerrarModal();
      fetchPrestamos();
      showToast("Préstamo eliminado correctamente", "success");
    } catch (err) {
      console.error(err);
      showToast("Error eliminando préstamo", "error");
    }
  };

  const handleRegistrarPago = async () => {
    if (!selectedPrestamo) return;

    const cuotaSemanal = calcularCuotaSemanal(
      selectedPrestamo.monto,
      selectedPrestamo.interes,
      selectedPrestamo.cuotas
    );

    const cuotasPagadas = pagos.map((p) => p.numeroCuota);
    let siguienteCuota = 1;
    while (cuotasPagadas.includes(siguienteCuota)) siguienteCuota++;

    if (siguienteCuota > selectedPrestamo.cuotas) {
      showToast("Este préstamo ya tiene todas las cuotas pagadas", "warning");
      return;
    }

    if (
      !window.confirm(
        `¿Registrar pago de cuota #${siguienteCuota} por Q${cuotaSemanal.toLocaleString("es-GT", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}?`
      )
    )
      return;

    setRegistrandoPago(true);
    try {
      const token = localStorage.getItem("token");
      const hoy = new Date().toISOString().split("T")[0];

      const res = await fetch(ROUTES.PAGOS, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          prestamoId: selectedPrestamo.id,
          numeroCuota: siguienteCuota,
          montoPagado: cuotaSemanal.toFixed(2),
          fechaPago: hoy,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.message || "Error al registrar pago", "error");
        return;
      }

      await fetchPagos(selectedPrestamo.id);
      await fetchPrestamos();
      showToast(`✅ Cuota #${siguienteCuota} registrada correctamente`, "success");
    } catch (err) {
      console.error(err);
      showToast("Error al registrar pago", "error");
    } finally {
      setRegistrandoPago(false);
    }
  };

  const cuotasPagadas = pagos.map((p) => p.numeroCuota);
  let siguienteCuota = 1;
  while (cuotasPagadas.includes(siguienteCuota)) siguienteCuota++;
  const todasPagadas = selectedPrestamo
    ? siguienteCuota > selectedPrestamo.cuotas
    : false;

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
                onClick={() => abrirModal(prestamo)}
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
                  <div className="flex items-center justify-between">
                    <p>
                      <span className="font-medium text-[var(--text)]">Monto:</span>{" "}
                      Q{Number(prestamo.monto).toLocaleString()}
                    </p>
                    <p className="font-bold" style={{ color: "var(--primary)" }}>
                      Q{cuotaSemanal.toLocaleString("es-GT", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}/sem
                    </p>
                  </div>
                  <p><span className="font-medium text-[var(--text)]">Interés:</span> {prestamo.interes}%</p>
                  <p><span className="font-medium text-[var(--text)]">Cuotas:</span> {prestamo.cuotas} semanas</p>
                  <p><span className="font-medium text-[var(--text)]">Inicio:</span> {formatearFecha(prestamo.fechaInicio)}</p>
                  <p><span className="font-medium text-[var(--text)]">Fin:</span> {formatearFecha(prestamo.fechaFin)}</p>
                </div>

                {prestamo.estado === "activo" && (
                  <div className="mt-3">
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full transition-all"
                        style={{
                          width: `${Math.min(
                            100,
                            ((new Date() - new Date(prestamo.fechaInicio)) /
                              (new Date(prestamo.fechaFin) - new Date(prestamo.fechaInicio))) * 100
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
                              (new Date(prestamo.fechaFin) - new Date(prestamo.fechaInicio))) * 100
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
          onClick={cerrarModal}
        >
          <div
            className="rounded-3xl shadow-2xl p-6 w-full max-w-sm mx-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: "var(--card)",
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

            <div className="flex items-center justify-center gap-3 mb-4">
              <p className="text-2xl font-bold" style={{ color: "var(--primary)" }}>
                Q{Number(selectedPrestamo.monto).toLocaleString()}
              </p>
              <span className="text-gray-400">|</span>
              <p className="text-lg font-bold" style={{ color: "var(--primary)" }}>
                Q{calcularCuotaSemanal(
                  selectedPrestamo.monto,
                  selectedPrestamo.interes,
                  selectedPrestamo.cuotas
                ).toLocaleString("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/sem
              </p>
            </div>

            <div className="space-y-2 text-sm mb-4 rounded-xl p-4" style={{ backgroundColor: "var(--bg)" }}>
              <p><span className="font-semibold">Interés:</span> {selectedPrestamo.interes}%</p>
              <p><span className="font-semibold">Cuotas:</span> {selectedPrestamo.cuotas} semanas</p>
              <p><span className="font-semibold">Fecha inicio:</span> {formatearFecha(selectedPrestamo.fechaInicio)}</p>
              <p><span className="font-semibold">Fecha fin:</span> {formatearFecha(selectedPrestamo.fechaFin)}</p>
              <hr style={{ borderColor: "var(--card-border)" }} />
              <p>
                <span className="font-semibold">Total a pagar:</span>{" "}
                Q{(Number(selectedPrestamo.monto) * (1 + Number(selectedPrestamo.interes) / 100)).toLocaleString("es-GT", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
            </div>

            {selectedPrestamo.estado === "activo" && (
              <div
                className="rounded-xl p-4 mb-4 text-center"
                style={{
                  backgroundColor: todasPagadas ? "#dcfce7" : "var(--bg)",
                  border: `1px solid ${todasPagadas ? "#86efac" : "var(--card-border)"}`,
                }}
              >
                {todasPagadas ? (
                  <p className="text-green-700 font-semibold">✅ Todas las cuotas han sido pagadas</p>
                ) : (
                  <>
                    <p className="text-sm opacity-60 mb-1">Siguiente cuota pendiente</p>
                    <p className="text-lg font-bold" style={{ color: "var(--primary)" }}>
                      Cuota #{siguienteCuota} de {selectedPrestamo.cuotas}
                    </p>
                    <p className="text-sm font-semibold mt-1">
                      Q{calcularCuotaSemanal(
                        selectedPrestamo.monto,
                        selectedPrestamo.interes,
                        selectedPrestamo.cuotas
                      ).toLocaleString("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </>
                )}
              </div>
            )}

            <div className="mb-4">
              <p className="text-sm font-semibold mb-2">Historial de pagos</p>
              {loadingPagos ? (
                <p className="text-xs opacity-50">Cargando pagos...</p>
              ) : pagos.length === 0 ? (
                <p className="text-xs opacity-50">Sin pagos registrados aún.</p>
              ) : (
                <div className="space-y-2 max-h-36 overflow-y-auto">
                  {pagos.map((pago) => (
                    <div
                      key={pago.id}
                      className="flex items-center justify-between text-xs rounded-lg px-3 py-2"
                      style={{
                        backgroundColor: "var(--bg)",
                        border: "1px solid var(--card-border)",
                      }}
                    >
                      <span className="font-semibold" style={{ color: "var(--primary)" }}>
                        Cuota #{pago.numeroCuota}
                      </span>
                      <span>Q{Number(pago.montoPagado).toLocaleString("es-GT", { minimumFractionDigits: 2 })}</span>
                      <span className="opacity-60">{formatearFecha(pago.fechaPago)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2">
              {selectedPrestamo.estado === "activo" && !todasPagadas && (
                <button
                  onClick={handleRegistrarPago}
                  disabled={registrandoPago}
                  className="w-full py-2 text-white rounded-xl font-semibold hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: "var(--primary)" }}
                >
                  {registrandoPago ? "Registrando..." : `💰 Registrar Cuota #${siguienteCuota}`}
                </button>
              )}

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
                onClick={cerrarModal}
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

      {/* TOAST */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={closeToast} />}
    </div>
  );
}