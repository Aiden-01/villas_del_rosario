import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Toast from "../components/Toast";
import useToast from "../hooks/useToast";
import {
  HandCoins,
  CheckCircle2,
  Plus,
  Pencil,
  Trash2,
  X,
  AlertTriangle,
  PartyPopper,
  Inbox,
  ClipboardList,
  Filter,
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3333";

const ROUTES = {
  PRESTAMOS: `${API_URL}/api/ventas`,
  CLIENTES: `${API_URL}/api/clientes`,
  PAGOS: `${API_URL}/api/pagos`,
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

const calcularCuotaMensual = (monto, cuotas) => Number(monto) / Number(cuotas || 1);

const resumirCuotas = (prestamo, pagos = prestamo?.pagos || []) => {
  const cuotaMensual = calcularCuotaMensual(prestamo?.monto, prestamo?.cuotas);
  const pagosPorCuota = new Map();

  pagos.forEach((pago) => {
    const actual = pagosPorCuota.get(pago.numeroCuota) || 0;
    pagosPorCuota.set(
      pago.numeroCuota,
      Number((actual + Number(pago.montoPagado)).toFixed(2))
    );
  });

  let cuotasPagadas = 0;
  let siguienteCuota = null;
  let montoPendienteCuota = 0;

  for (let cuota = 1; cuota <= Number(prestamo?.cuotas || 0); cuota++) {
    const pagado = pagosPorCuota.get(cuota) || 0;
    if (pagado + 0.01 >= cuotaMensual) {
      cuotasPagadas += 1;
      continue;
    }

    siguienteCuota = cuota;
    montoPendienteCuota = Number(Math.max(cuotaMensual - pagado, 0).toFixed(2));
    break;
  }

  return {
    cuotaMensual,
    cuotasPagadas,
    siguienteCuota,
    montoPendienteCuota,
    todasPagadas: !siguienteCuota,
  };
};

const formatearFecha = (fecha) => {
  if (!fecha) return "";
  const [year, month, day] = String(fecha).split("T")[0].split("-");
  return `${day}-${month}-${year}`;
};

const mesesDesdeFinalizacion = (prestamo) => {
  const fin = new Date(prestamo.fechaFin);
  const hoy = new Date();
  return (hoy.getFullYear() - fin.getFullYear()) * 12 + (hoy.getMonth() - fin.getMonth());
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
  const [mostrarAntiguos, setMostrarAntiguos] = useState(false);
  const [busquedaFinalizado, setBusquedaFinalizado] = useState("");
  const { toast, showToast, closeToast } = useToast();

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const clienteId = searchParams.get("clienteId");

  const fetchPrestamos = async () => {
    try {
      const token = localStorage.getItem("token");
      const url = clienteId ? `${ROUTES.PRESTAMOS}/cliente/${clienteId}` : ROUTES.PRESTAMOS;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Error cargando ventas");
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
      const res = await fetch(`${ROUTES.PAGOS}/venta/${prestamoId}`, {
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
    if (!window.confirm("¿Seguro que deseas eliminar esta venta?")) return;
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
      showToast("Venta eliminada correctamente", "success");
    } catch (err) {
      console.error(err);
      showToast("Error eliminando venta", "error");
    }
  };

  const resumenSeleccionado = useMemo(
    () => (selectedPrestamo ? resumirCuotas(selectedPrestamo, pagos) : null),
    [selectedPrestamo, pagos]
  );

  const handleRegistrarPago = async () => {
    if (!selectedPrestamo || !resumenSeleccionado || resumenSeleccionado.todasPagadas) return;

    const monto = resumenSeleccionado.montoPendienteCuota.toFixed(2);

    if (
      !window.confirm(
        `¿Registrar pago de cuota #${resumenSeleccionado.siguienteCuota} por Q${Number(monto).toLocaleString("es-GT", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}?`
      )
    ) {
      return;
    }

    setRegistrandoPago(true);
    try {
      const token = localStorage.getItem("token");
      const hoy = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Guatemala" });

      const res = await fetch(ROUTES.PAGOS, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          prestamoId: selectedPrestamo.id,
          numeroCuota: resumenSeleccionado.siguienteCuota,
          montoPagado: monto,
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

      if (resumenSeleccionado.siguienteCuota >= selectedPrestamo.cuotas && Number(monto) >= Number(resumenSeleccionado.montoPendienteCuota)) {
        cerrarModal();
        setPestana("finalizados");
        showToast("¡Venta pagada! Todas las cuotas quedaron saldadas", "success");
      } else {
        showToast(`Cuota #${resumenSeleccionado.siguienteCuota} registrada correctamente`, "success");
      }
    } catch (err) {
      console.error(err);
      showToast("Error al registrar pago", "error");
    } finally {
      setRegistrandoPago(false);
    }
  };

  const prestamosActivos = prestamos.filter((p) => p.estado !== "pagado");
  const todosFinalizados = prestamos.filter((p) => p.estado === "pagado");
  const finalizadosRecientes = todosFinalizados.filter((p) => mesesDesdeFinalizacion(p) <= 6);
  const finalizadosAntiguos = todosFinalizados.filter((p) => mesesDesdeFinalizacion(p) > 6);
  const finalizadosBase = mostrarAntiguos ? todosFinalizados : finalizadosRecientes;
  const prestamosFinalizados = busquedaFinalizado.trim()
    ? todosFinalizados.filter((p) =>
        `${p.cliente?.nombres} ${p.cliente?.apellidos}`.toLowerCase().includes(busquedaFinalizado.toLowerCase())
      )
    : finalizadosBase;

  const prestamosVisibles = pestana === "activos" ? prestamosActivos : prestamosFinalizados;
  const esPagado = selectedPrestamo?.estado === "pagado";

  return (
    <div className="pt-16 text-[var(--text)]">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Ventas</h1>
          {clienteNombre && (
            <p className="text-sm text-gray-400 mt-1">
              Filtrando por: <span className="font-semibold text-[var(--primary)]">{clienteNombre}</span>
            </p>
          )}
        </div>
        <button
          onClick={() => navigate(clienteId ? `/ventas/crear?clienteId=${clienteId}` : "/ventas/crear")}
          className="flex items-center gap-2 bg-[var(--primary)] text-white px-4 py-2 rounded-lg shadow hover:opacity-90"
        >
          <Plus size={16} />
          Crear Venta
        </button>
      </div>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setPestana("activos")}
          className={`flex items-center gap-2 px-5 py-2 rounded-xl font-semibold text-sm transition-all ${pestana === "activos" ? "text-white shadow" : "opacity-50 hover:opacity-80"}`}
          style={{
            backgroundColor: pestana === "activos" ? "var(--primary)" : "var(--card)",
            border: "1px solid var(--card-border)",
          }}
        >
          <HandCoins size={15} />
          Activas
        </button>
        <button
          onClick={() => setPestana("finalizados")}
          className={`flex items-center gap-2 px-5 py-2 rounded-xl font-semibold text-sm transition-all ${pestana === "finalizados" ? "text-white shadow" : "opacity-50 hover:opacity-80"}`}
          style={{
            backgroundColor: pestana === "finalizados" ? "#6b7280" : "var(--card)",
            border: "1px solid var(--card-border)",
          }}
        >
          <CheckCircle2 size={15} />
          Finalizadas
        </button>
      </div>

      {pestana === "finalizados" && (
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="flex-1 relative">
            <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-40" />
            <input
              type="text"
              placeholder="Buscar por nombre del cliente..."
              value={busquedaFinalizado}
              onChange={(e) => setBusquedaFinalizado(e.target.value)}
              className="w-full pl-8 pr-4 py-2 rounded-xl text-sm"
              style={{
                backgroundColor: "var(--card)",
                border: "1px solid var(--card-border)",
                color: "var(--text)",
              }}
            />
          </div>
          {!busquedaFinalizado && finalizadosAntiguos.length > 0 && (
            <button
              onClick={() => setMostrarAntiguos(!mostrarAntiguos)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
              style={{
                backgroundColor: mostrarAntiguos ? "#6b7280" : "var(--card)",
                color: mostrarAntiguos ? "white" : "var(--text)",
                border: "1px solid var(--card-border)",
              }}
            >
              {mostrarAntiguos ? "Ocultar antiguas" : `Ver todas (+${finalizadosAntiguos.length})`}
            </button>
          )}
        </div>
      )}

      {loading && <p>Cargando ventas...</p>}
      {error && <p className="text-red-500">{error}</p>}
      {!loading && prestamosVisibles.length === 0 && (
        <div
          className="rounded-2xl p-10 text-center shadow"
          style={{ backgroundColor: "var(--card)", border: "1px solid var(--card-border)" }}
        >
          <div className="flex justify-center mb-3">
            {pestana === "activos" ? (
              <Inbox size={40} className="opacity-40" />
            ) : (
              <PartyPopper size={40} className="opacity-40" />
            )}
          </div>
          <p className="font-semibold opacity-70">
            {pestana === "activos" ? "No hay ventas activas." : "Aún no hay ventas finalizadas."}
          </p>
        </div>
      )}

      {!loading && prestamosVisibles.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {prestamosVisibles.map((prestamo) => {
            const mora = esMora(prestamo);
            const pagado = prestamo.estado === "pagado";
            const resumen = resumirCuotas(prestamo);

            return (
              <div
                key={prestamo.id}
                onClick={() => abrirModal(prestamo)}
                className="rounded-2xl shadow-md p-5 cursor-pointer hover:scale-105 hover:shadow-xl transition-all duration-200"
                style={{
                  backgroundColor: "var(--card)",
                  border: pagado ? "2px solid #6b7280" : mora ? "2px solid #ef4444" : "2px solid transparent",
                  opacity: pagado ? 0.85 : 1,
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-bold text-base">
                    {prestamo.cliente?.nombres} {prestamo.cliente?.apellidos}
                  </h2>
                  <span
                    className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full font-semibold ${pagado ? "bg-blue-100 text-blue-700" : mora ? "bg-red-100 text-red-700" : ESTADO_COLORS[prestamo.estado] || "bg-gray-100 text-gray-600"}`}
                  >
                    {pagado ? (
                      <>
                        <CheckCircle2 size={11} /> pagado
                      </>
                    ) : mora ? (
                      <>
                        <AlertTriangle size={11} /> mora
                      </>
                    ) : (
                      prestamo.estado
                    )}
                  </span>
                </div>

                <div className="space-y-1 text-sm text-gray-500">
                  <div className="flex items-center justify-between">
                    <p>
                      <span className="font-medium text-[var(--text)]">Lote:</span> {prestamo.numeroLote || "N/A"}
                    </p>
                    <p className="font-bold" style={{ color: pagado ? "#6b7280" : "var(--primary)" }}>
                      Q{resumen.cuotaMensual.toLocaleString("es-GT", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                      /mes
                    </p>
                  </div>
                  <p><span className="font-medium text-[var(--text)]">Precio:</span> Q{Number(prestamo.monto).toLocaleString()}</p>
                  <p><span className="font-medium text-[var(--text)]">Cuotas:</span> {resumen.cuotasPagadas}/{prestamo.cuotas}</p>
                  <p><span className="font-medium text-[var(--text)]">Inicio:</span> {formatearFecha(prestamo.fechaInicio)}</p>
                  <p><span className="font-medium text-[var(--text)]">Fin:</span> {formatearFecha(prestamo.fechaFin)}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

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
              border: esPagado ? "2px solid #3b82f6" : esMora(selectedPrestamo) ? "2px solid #ef4444" : "none",
            }}
          >
            <div className="flex justify-center mb-4">
              <span
                className={`flex items-center gap-1 text-sm px-4 py-1 rounded-full font-semibold ${esPagado ? "bg-blue-100 text-blue-700" : esMora(selectedPrestamo) ? "bg-red-100 text-red-700" : ESTADO_COLORS[selectedPrestamo.estado] || "bg-gray-100 text-gray-600"}`}
              >
                {esPagado ? (
                  <>
                    <CheckCircle2 size={13} /> Pagada
                  </>
                ) : esMora(selectedPrestamo) ? (
                  <>
                    <AlertTriangle size={13} /> En mora
                  </>
                ) : (
                  selectedPrestamo.estado
                )}
              </span>
            </div>

            <h2 className="text-xl font-bold text-center mb-1">
              {selectedPrestamo.cliente?.nombres} {selectedPrestamo.cliente?.apellidos}
            </h2>

            <div className="flex items-center justify-center gap-3 mb-4">
              <p className="text-2xl font-bold" style={{ color: "var(--primary)" }}>
                Q{Number(selectedPrestamo.monto).toLocaleString()}
              </p>
            </div>

            <div className="space-y-2 text-sm mb-4 rounded-xl p-4" style={{ backgroundColor: "var(--bg)" }}>
              <p><span className="font-semibold">Lote:</span> {selectedPrestamo.numeroLote || "N/A"}</p>
              <p><span className="font-semibold">Medida:</span> {selectedPrestamo.medidaLote || "N/A"}</p>
              <p><span className="font-semibold">Área:</span> {selectedPrestamo.areaLote || "N/A"}</p>
              <p><span className="font-semibold">Cuotas:</span> {resumenSeleccionado?.cuotasPagadas || 0}/{selectedPrestamo.cuotas}</p>
              <p><span className="font-semibold">Fracción:</span> {`${resumenSeleccionado?.cuotasPagadas || 0}/${selectedPrestamo.cuotas}`}</p>
              <p><span className="font-semibold">Porcentaje:</span> {Math.round((((resumenSeleccionado?.cuotasPagadas || 0) / selectedPrestamo.cuotas) || 0) * 100)}%</p>
              <p><span className="font-semibold">Cobro:</span> Manual</p>
              {selectedPrestamo.fechaCobro && (
                <p><span className="font-semibold">Fecha pactada:</span> {formatearFecha(selectedPrestamo.fechaCobro)}</p>
              )}
              <p><span className="font-semibold">Fecha inicio:</span> {formatearFecha(selectedPrestamo.fechaInicio)}</p>
              <p><span className="font-semibold">Fecha fin:</span> {formatearFecha(selectedPrestamo.fechaFin)}</p>
              <hr style={{ borderColor: "var(--card-border)" }} />
              <p>
                <span className="font-semibold">Cuota mensual:</span>{" "}
                Q{calcularCuotaMensual(selectedPrestamo.monto, selectedPrestamo.cuotas).toLocaleString("es-GT", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
              {!resumenSeleccionado?.todasPagadas && (
                <p>
                  <span className="font-semibold">Pendiente actual:</span> Q
                  {Number(resumenSeleccionado?.montoPendienteCuota || 0).toLocaleString("es-GT", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })} de la cuota #{resumenSeleccionado?.siguienteCuota}
                </p>
              )}
            </div>

            {esPagado && (
              <div className="rounded-xl p-4 mb-4 text-center bg-blue-50" style={{ border: "1px solid #bfdbfe" }}>
                <div className="flex justify-center mb-1">
                  <PartyPopper size={28} className="text-blue-400" />
                </div>
                <p className="text-blue-700 font-semibold">¡Venta finalizada!</p>
              </div>
            )}

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

            <div className="flex flex-col gap-2">
              {!esPagado && selectedPrestamo.estado === "activo" && !resumenSeleccionado?.todasPagadas && (
                <button
                  onClick={handleRegistrarPago}
                  disabled={registrandoPago}
                  className="w-full flex items-center justify-center gap-2 py-2 text-white rounded-xl font-semibold hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: "var(--primary)" }}
                >
                  <HandCoins size={16} />
                  {registrandoPago
                    ? "Registrando..."
                    : `Saldar cuota #${resumenSeleccionado?.siguienteCuota}`}
                </button>
              )}

              {!esPagado && (
                <button
                  onClick={() => navigate(`/ventas/editar/${selectedPrestamo.id}`)}
                  className="w-full flex items-center justify-center gap-2 py-2 bg-blue-500 text-white rounded-xl font-semibold hover:opacity-90"
                >
                  <Pencil size={15} />
                  Editar Venta
                </button>
              )}

              {!esPagado && user?.role === "admin" && (
                <button
                  onClick={() => handleDelete(selectedPrestamo.id)}
                  className="w-full flex items-center justify-center gap-2 py-2 bg-red-500 text-white rounded-xl font-semibold hover:opacity-90"
                >
                  <Trash2 size={15} />
                  Eliminar Venta
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
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={closeToast} />}
    </div>
  );
}
