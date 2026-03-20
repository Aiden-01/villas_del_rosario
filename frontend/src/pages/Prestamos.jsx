import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Toast from "../components/Toast";
import useToast from "../hooks/useToast";
import {
  HandCoins, CheckCircle2, Plus, Pencil, Trash2,
  X, AlertTriangle, PartyPopper, Inbox, ClipboardList,
  MapPin
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3333";

const ROUTES = {
  PRESTAMOS: `${API_URL}/api/prestamos`,
  CLIENTES: `${API_URL}/api/clientes`,
  PAGOS: `${API_URL}/api/pagos`,
};

const ESTADO_COLORS = {
  activo: "bg-green-100 text-green-700",
  pagado: "bg-blue-100 text-blue-700",
  vencido: "bg-red-100 text-red-700",
  cancelado: "bg-gray-100 text-gray-500",
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
  const [pestana, setPestana] = useState("activos");
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

      if (siguienteCuota >= selectedPrestamo.cuotas) {
        cerrarModal();
        setPestana("finalizados");
        showToast("¡Préstamo cancelado! Todas las cuotas pagadas", "success");
      } else {
        showToast(`Cuota #${siguienteCuota} registrada correctamente`, "success");
      }
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

  const prestamosActivos = prestamos.filter((p) => p.estado !== "cancelado");
  const prestamosFinalizados = prestamos.filter((p) => p.estado === "cancelado");
  const prestamosVisibles = pestana === "activos" ? prestamosActivos : prestamosFinalizados;

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
          className="flex items-center gap-2 bg-[var(--primary)] text-white px-4 py-2 rounded-lg shadow hover:opacity-90"
        >
          <Plus size={16} />
          Crear Préstamo
        </button>
      </div>

      {/* PESTAÑAS */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setPestana("activos")}
          className={`flex items-center gap-2 px-5 py-2 rounded-xl font-semibold text-sm transition-all ${
            pestana === "activos" ? "text-white shadow" : "opacity-50 hover:opacity-80"
          }`}
          style={{
            backgroundColor: pestana === "activos" ? "var(--primary)" : "var(--card)",
            border: "1px solid var(--card-border)",
          }}
        >
          <HandCoins size={15} />
          Activos
          {prestamosActivos.length > 0 && (
            <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
              {prestamosActivos.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setPestana("finalizados")}
          className={`flex items-center gap-2 px-5 py-2 rounded-xl font-semibold text-sm transition-all ${
            pestana === "finalizados" ? "text-white shadow" : "opacity-50 hover:opacity-80"
          }`}
          style={{
            backgroundColor: pestana === "finalizados" ? "#6b7280" : "var(--card)",
            border: "1px solid var(--card-border)",
          }}
        >
          <CheckCircle2 size={15} />
          Finalizados
          {prestamosFinalizados.length > 0 && (
            <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
              {prestamosFinalizados.length}
            </span>
          )}
        </button>
      </div>

      {loading && <p>Cargando préstamos...</p>}
      {error && <p className="text-red-500">{error}</p>}
      {!loading && prestamosVisibles.length === 0 && (
        <div
          className="rounded-2xl p-10 text-center shadow"
          style={{ backgroundColor: "var(--card)", border: "1px solid var(--card-border)" }}
        >
          <div className="flex justify-center mb-3">
            {pestana === "activos"
              ? <Inbox size={40} className="opacity-40" />
              : <PartyPopper size={40} className="opacity-40" />
            }
          </div>
          <p className="font-semibold opacity-70">
            {pestana === "activos"
              ? "No hay préstamos activos."
              : "Aún no hay préstamos finalizados."}
          </p>
        </div>
      )}

      {/* GRID */}
      {!loading && prestamosVisibles.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {prestamosVisibles.map((prestamo) => {
            const mora = esMora(prestamo);
            const cancelado = prestamo.estado === "cancelado";
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
                  border: cancelado
                    ? "2px solid #6b7280"
                    : mora
                    ? "2px solid #ef4444"
                    : "2px solid transparent",
                  opacity: cancelado ? 0.85 : 1,
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-bold text-base">
                    {prestamo.cliente?.nombres} {prestamo.cliente?.apellidos}
                  </h2>
                  <span
                    className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full font-semibold ${
                      cancelado
                        ? "bg-gray-100 text-gray-500"
                        : mora
                        ? "bg-red-100 text-red-700"
                        : ESTADO_COLORS[prestamo.estado] || "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {cancelado
                      ? <><CheckCircle2 size={11} /> cancelado</>
                      : mora
                      ? <><AlertTriangle size={11} /> mora</>
                      : prestamo.estado
                    }
                  </span>
                </div>

                <div className="space-y-1 text-sm text-gray-500">
                  <div className="flex items-center justify-between">
                    <p>
                      <span className="font-medium text-[var(--text)]">Monto:</span>{" "}
                      Q{Number(prestamo.monto).toLocaleString()}
                    </p>
                    <p className="font-bold" style={{ color: cancelado ? "#6b7280" : "var(--primary)" }}>
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
                        ? <span className="flex items-center justify-end gap-1"><AlertTriangle size={10} /> Plazo vencido</span>
                        : `${Math.round(
                            ((new Date() - new Date(prestamo.fechaInicio)) /
                              (new Date(prestamo.fechaFin) - new Date(prestamo.fechaInicio))) * 100
                          )}% del plazo`
                      }
                    </p>
                  </div>
                )}

                {cancelado && (
                  <div className="mt-3 text-center">
                    <span className="flex items-center justify-center gap-1 text-xs text-gray-400">
                      <CheckCircle2 size={12} /> Todas las cuotas pagadas
                    </span>
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
              border: selectedPrestamo.estado === "cancelado"
                ? "2px solid #6b7280"
                : esMora(selectedPrestamo)
                ? "2px solid #ef4444"
                : "none",
            }}
          >
            <div className="flex justify-center mb-4">
              <span
                className={`flex items-center gap-1 text-sm px-4 py-1 rounded-full font-semibold ${
                  selectedPrestamo.estado === "cancelado"
                    ? "bg-gray-100 text-gray-500"
                    : esMora(selectedPrestamo)
                    ? "bg-red-100 text-red-700"
                    : ESTADO_COLORS[selectedPrestamo.estado] || "bg-gray-100 text-gray-600"
                }`}
              >
                {selectedPrestamo.estado === "cancelado"
                  ? <><CheckCircle2 size={13} /> Cancelado</>
                  : esMora(selectedPrestamo)
                  ? <><AlertTriangle size={13} /> En mora</>
                  : selectedPrestamo.estado
                }
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

            {/* Banner cancelado */}
            {selectedPrestamo.estado === "cancelado" && (
              <div className="rounded-xl p-4 mb-4 text-center bg-gray-100" style={{ border: "1px solid #d1d5db" }}>
                <div className="flex justify-center mb-1">
                  <PartyPopper size={28} className="text-gray-500" />
                </div>
                <p className="text-gray-600 font-semibold">¡Préstamo finalizado!</p>
                <p className="text-xs text-gray-400 mt-1">Todas las {selectedPrestamo.cuotas} cuotas fueron pagadas</p>
              </div>
            )}

            {selectedPrestamo.estado === "activo" && (
              <div
                className="rounded-xl p-4 mb-4 text-center"
                style={{
                  backgroundColor: todasPagadas ? "#dcfce7" : "var(--bg)",
                  border: `1px solid ${todasPagadas ? "#86efac" : "var(--card-border)"}`,
                }}
              >
                {todasPagadas ? (
                  <p className="flex items-center justify-center gap-2 text-green-700 font-semibold">
                    <CheckCircle2 size={16} /> Todas las cuotas han sido pagadas
                  </p>
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

            {/* Historial de pagos */}
            <div className="mb-4">
              <p className="flex items-center gap-2 text-sm font-semibold mb-2">
                <ClipboardList size={15} /> Historial de pagos
              </p>
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

            {/* Botones */}
            <div className="flex flex-col gap-2">
              {selectedPrestamo.estado === "activo" && !todasPagadas && (
                <button
                  onClick={handleRegistrarPago}
                  disabled={registrandoPago}
                  className="w-full flex items-center justify-center gap-2 py-2 text-white rounded-xl font-semibold hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: "var(--primary)" }}
                >
                  <HandCoins size={16} />
                  {registrandoPago ? "Registrando..." : `Registrar Cuota #${siguienteCuota}`}
                </button>
              )}

              <button
                onClick={() => navigate(`/prestamos/editar/${selectedPrestamo.id}`)}
                className="w-full flex items-center justify-center gap-2 py-2 bg-blue-500 text-white rounded-xl font-semibold hover:opacity-90"
              >
                <Pencil size={15} />
                Editar Préstamo
              </button>

              {user?.role === "admin" && (
                <button
                  onClick={() => handleDelete(selectedPrestamo.id)}
                  className="w-full flex items-center justify-center gap-2 py-2 bg-red-500 text-white rounded-xl font-semibold hover:opacity-90"
                >
                  <Trash2 size={15} />
                  Eliminar Préstamo
                </button>
              )}

              <button
                onClick={cerrarModal}
                className="w-full flex items-center justify-center gap-2 py-2 bg-gray-300 text-gray-800 rounded-xl font-semibold hover:opacity-90 mt-1"
              >
                <X size={15} />
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