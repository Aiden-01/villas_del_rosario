import { useCallback, useEffect, useMemo, useState } from "react";
import useToast from "../hooks/useToast";
import Toast from "../components/Toast";
import {
  AlertTriangle,
  Ban,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  HandCoins,
  Phone,
  RefreshCw,
  StickyNote,
  X,
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3333";
const TZ = "America/Guatemala";

const hoyISO = () => new Date().toLocaleDateString("sv-SE", { timeZone: TZ });
const mesActual = () => hoyISO().slice(0, 7);

const formatearFecha = (fecha) => {
  if (!fecha) return "";
  return new Intl.DateTimeFormat("es-GT", {
    timeZone: TZ,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(`${fecha}T12:00:00`));
};

const formatearFechaCorta = (fecha) => {
  if (!fecha) return "";
  const [y, m, d] = String(fecha).split("T")[0].split("-");
  return `${d}/${m}/${y}`;
};

const formatearMoneda = (valor) =>
  Number(valor || 0).toLocaleString("es-GT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const badgePorEstado = (item) => {
  if (item.esHoy) {
    return {
      label: "Hoy",
      background: "#dcfce7",
      color: "#166534",
    };
  }

  if (item.estaVencido) {
    return {
      label: "Atrasado",
      background: "#fee2e2",
      color: "#991b1b",
    };
  }

  return {
    label: "Programado",
    background: "#dbeafe",
    color: "#1d4ed8",
  };
};

export default function PagosAgenda() {
  const [datos, setDatos] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mesSeleccionado, setMesSeleccionado] = useState(mesActual());
  const [registrando, setRegistrando] = useState(null);

  const [modalItem, setModalItem] = useState(null);
  const [modalTipo, setModalTipo] = useState(null);
  const [montoParcial, setMontoParcial] = useState("");
  const [notaSeguimiento, setNotaSeguimiento] = useState("");
  const [fechaProgramada, setFechaProgramada] = useState(hoyISO());
  const [guardandoSeguimiento, setGuardandoSeguimiento] = useState(false);

  const { toast, showToast, closeToast } = useToast();
  const token = localStorage.getItem("token");
  const headers = useMemo(
    () => ({ Authorization: `Bearer ${token}`, "Content-Type": "application/json" }),
    [token]
  );

  const cargarCalendario = useCallback(async (mes = mesSeleccionado) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/api/pagos/calendario?mes=${mes}`, { headers });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Error al cargar calendario de pagos");
        return;
      }
      setDatos(data);
    } catch {
      setError("No se pudo conectar con el servidor");
    } finally {
      setLoading(false);
    }
  }, [headers, mesSeleccionado]);

  useEffect(() => {
    cargarCalendario(mesSeleccionado);
  }, [cargarCalendario, mesSeleccionado]);

  useEffect(() => {
    document.body.style.overflow = modalItem ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [modalItem]);

  const abrirModal = (item, tipo) => {
    setModalItem(item);
    setModalTipo(tipo);
    setMontoParcial("");
    setNotaSeguimiento("");
    setFechaProgramada(hoyISO());
  };

  const cerrarModal = () => {
    setModalItem(null);
    setModalTipo(null);
  };

  const registrarPagoCompleto = async (item) => {
    const monto = Number(item.montoPendienteCuota || item.montoCuota).toFixed(2);
    const hoy = hoyISO();

    if (item.fechaProgramada !== hoy) {
      const confirmado = window.confirm(
        `La fecha pactada para este cobro es ${formatearFechaCorta(
          item.fechaProgramada
        )} y hoy es ${formatearFechaCorta(
          hoy
        )}. ¿Seguro que deseas registrar el pago ahora?`
      );
      if (!confirmado) return;
    } else if (!window.confirm(`Registrar pago de Q${monto} para ${item.cliente.nombres}?`)) {
      return;
    }

    setRegistrando(item.prestamoId);
    try {
      const res = await fetch(`${API_URL}/api/pagos`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          prestamoId: item.prestamoId,
          numeroCuota: item.proximaCuota,
          montoPagado: monto,
          fechaPago: hoy,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.message || "Error al registrar pago", "error");
        return;
      }
      showToast(`Cuota #${item.proximaCuota} registrada correctamente`, "success");
      await cargarCalendario(mesSeleccionado);
    } catch {
      showToast("Error al registrar pago", "error");
    } finally {
      setRegistrando(null);
    }
  };

  const guardarGestion = async () => {
    if (!fechaProgramada) {
      showToast("Selecciona la fecha para volver a cobrar", "error");
      return;
    }

    if (!notaSeguimiento.trim()) {
      showToast("Agrega una nota explicando la gestion", "error");
      return;
    }

    if (modalTipo === "pago_parcial") {
      const monto = Number(montoParcial);
      if (!monto || monto <= 0) {
        showToast("Ingresa el monto parcial recibido", "error");
        return;
      }
      if (monto >= Number(modalItem.montoPendienteCuota)) {
        showToast("Si cubre todo el pendiente, registra el pago como completo", "error");
        return;
      }
    }

    setGuardandoSeguimiento(true);
    try {
      const res = await fetch(`${API_URL}/api/pagos/programaciones`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          prestamoId: modalItem.prestamoId,
          tipoGestion: modalTipo,
          montoPagado: modalTipo === "pago_parcial" ? Number(montoParcial) : 0,
          nota: notaSeguimiento.trim(),
          fechaProgramada,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.message || "Error al guardar gestion", "error");
        return;
      }

      showToast(
        modalTipo === "no_pago"
          ? `Cobro reprogramado para ${formatearFechaCorta(fechaProgramada)}`
          : `Pago parcial registrado y seguimiento para ${formatearFechaCorta(fechaProgramada)}`,
        "success"
      );
      cerrarModal();
      await cargarCalendario(mesSeleccionado);
    } catch {
      showToast("Error al guardar gestion", "error");
    } finally {
      setGuardandoSeguimiento(false);
    }
  };

  const inputStyle = {
    backgroundColor: "var(--bg)",
    color: "var(--text)",
    border: "1px solid var(--card-border)",
  };

  return (
    <div className="pt-16 text-[var(--text)]">
      <div className="max-w-6xl mx-auto">
        <div
          className="rounded-[28px] p-6 md:p-7 shadow-sm mb-6 overflow-hidden"
          style={{
            background:
              "linear-gradient(135deg, rgba(15,118,110,0.16), rgba(14,165,233,0.08) 42%, rgba(255,255,255,0.02))",
            border: "1px solid var(--card-border)",
          }}
        >
          <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-5">
            <div>
              <p className="uppercase tracking-[0.22em] text-xs font-semibold opacity-50 mb-2">
                Tablero mensual
              </p>
              <h1 className="flex items-center gap-3 text-3xl md:text-4xl font-bold">
                <CalendarDays size={30} style={{ color: "var(--primary)" }} />
                Pagos
              </h1>
              <p className="text-sm md:text-base opacity-70 mt-3 max-w-2xl">
                Visualiza a quién debes cobrarle durante el mes, con fechas pactadas y
                reprogramaciones activas en una sola vista.
              </p>
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs opacity-60">Mes</label>
                <input
                  type="month"
                  value={mesSeleccionado}
                  onChange={(e) => setMesSeleccionado(e.target.value)}
                  className="px-3 py-2 rounded-xl"
                  style={inputStyle}
                />
              </div>

              <button
                onClick={() => setMesSeleccionado(mesActual())}
                className="px-4 py-2 rounded-xl font-semibold hover:opacity-90"
                style={{
                  backgroundColor: "var(--card)",
                  border: "1px solid var(--card-border)",
                }}
              >
                Hoy
              </button>

              <button
                onClick={() => cargarCalendario(mesSeleccionado)}
                className="flex items-center gap-2 text-white px-4 py-2 rounded-xl shadow hover:opacity-90"
                style={{ backgroundColor: "var(--primary)" }}
              >
                <RefreshCw size={16} />
                Actualizar
              </button>
            </div>
          </div>
        </div>

        {loading && <p className="opacity-60">Cargando calendario...</p>}
        {error && <p className="text-red-500">{error}</p>}

        {!loading && datos && (
          <>
            <div className="grid gap-3 mb-8 grid-cols-2 xl:grid-cols-4">
              <div
                className="rounded-3xl p-5 shadow-sm"
                style={{ backgroundColor: "var(--card)", border: "1px solid var(--card-border)" }}
              >
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm opacity-60">Cobros del mes</p>
                  <Clock3 size={18} className="opacity-40" />
                </div>
                <p className="text-3xl font-bold" style={{ color: "var(--primary)" }}>
                  {datos.totalPendientes}
                </p>
                <p className="text-xs opacity-60 mt-2">Cuotas pendientes en {datos.mesLabel}</p>
              </div>

              <div
                className="rounded-3xl p-5 shadow-sm"
                style={{ backgroundColor: "var(--card)", border: "1px solid var(--card-border)" }}
              >
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm opacity-60">Para hoy</p>
                  <CheckCircle2 size={18} className="text-green-500 opacity-60" />
                </div>
                <p className="text-3xl font-bold text-green-500">{datos.totalHoy}</p>
                <p className="text-xs opacity-60 mt-2">Cobros con fecha de hoy</p>
              </div>

              <div
                className="rounded-3xl p-5 shadow-sm"
                style={{ backgroundColor: "var(--card)", border: "1px solid var(--card-border)" }}
              >
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm opacity-60">Reprogramados</p>
                  <Ban size={18} className="text-amber-500 opacity-60" />
                </div>
                <p className="text-3xl font-bold text-amber-500">{datos.totalReprogramados}</p>
                <p className="text-xs opacity-60 mt-2">Movidos de su fecha pactada</p>
              </div>

              <div
                className="rounded-3xl p-5 shadow-sm"
                style={{ backgroundColor: "var(--card)", border: "1px solid var(--card-border)" }}
              >
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm opacity-60">Vista activa</p>
                  <CalendarDays size={18} className="opacity-40" />
                </div>
                <p className="text-xl font-bold capitalize">{datos.mesLabel}</p>
                <p className="text-xs opacity-60 mt-2">
                  Agrupado por fechas de cobro del mes seleccionado
                </p>
              </div>
            </div>

            {datos.grupos?.length > 0 ? (
              <div className="space-y-8">
                {datos.grupos.map((grupo) => (
                  <section key={grupo.fecha}>
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div>
                        <h2 className="text-xl font-bold capitalize">
                          {formatearFecha(grupo.fecha)}
                        </h2>
                        <p className="text-sm opacity-60">
                          {grupo.total} {grupo.total === 1 ? "cliente pendiente" : "clientes pendientes"}
                        </p>
                      </div>

                      {grupo.fecha === datos.hoy && (
                        <span
                          className="px-3 py-1 rounded-full text-xs font-semibold"
                          style={{ backgroundColor: "#dcfce7", color: "#166534" }}
                        >
                          Hoy
                        </span>
                      )}
                    </div>

                    <div
                      className="rounded-[26px] overflow-hidden"
                      style={{
                        backgroundColor: "var(--card)",
                        border: "1px solid var(--card-border)",
                      }}
                    >
                      {grupo.items.map((item, index) => {
                        const badge = badgePorEstado(item);
                        const estaTemprano = item.fechaProgramada > datos.hoy;

                        return (
                          <div
                            key={`${item.prestamoId}-${item.proximaCuota}`}
                            className="px-4 md:px-6 py-4 md:py-5"
                            style={{
                              borderTop:
                                index === 0 ? "none" : "1px solid rgba(148, 163, 184, 0.18)",
                              background:
                                item.esHoy
                                  ? "linear-gradient(90deg, rgba(37,99,235,0.06), transparent 60%)"
                                  : "transparent",
                            }}
                          >
                            <div className="flex gap-4 items-start">
                              <div className="pt-3">
                                <div
                                  className="w-3 h-3 rounded-full"
                                  style={{
                                    backgroundColor: item.esReprogramado ? "#d97706" : "#2563eb",
                                  }}
                                />
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                                  <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2 mb-2">
                                      <h3 className="font-bold text-base md:text-lg truncate">
                                        {item.cliente.nombres} {item.cliente.apellidos}
                                      </h3>

                                      <span
                                        className="px-3 py-1 rounded-full text-xs font-semibold"
                                        style={{
                                          backgroundColor: badge.background,
                                          color: badge.color,
                                        }}
                                      >
                                        {badge.label}
                                      </span>

                                      {item.esReprogramado && (
                                        <span
                                          className="px-3 py-1 rounded-full text-xs font-semibold"
                                          style={{
                                            backgroundColor: "#ffedd5",
                                            color: "#9a3412",
                                          }}
                                        >
                                          Reprogramado
                                        </span>
                                      )}
                                    </div>

                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm opacity-70">
                                      <p className="flex items-center gap-1">
                                        <Phone size={13} />
                                        {item.cliente.telefono || "Sin telefono"}
                                      </p>
                                      <p>Lote: {item.numeroLote || "N/A"}</p>
                                      <p>
                                        Cuota {item.proximaCuota}/{item.totalCuotas}
                                      </p>
                                      <p>
                                        Avance: {item.cuotasPagadas}/{item.totalCuotas}
                                      </p>
                                    </div>

                                    <div className="mt-3 space-y-2 text-sm">
                                      <p className="opacity-75">
                                        Fecha pactada:{" "}
                                        <span className="font-semibold">
                                          {formatearFechaCorta(item.fechaPactada)}
                                        </span>
                                      </p>

                                      {item.esReprogramado && (
                                        <p className="opacity-75">
                                          Reprogramado para:{" "}
                                          <span className="font-semibold">
                                            {formatearFechaCorta(item.fechaProgramada)}
                                          </span>
                                        </p>
                                      )}

                                      {item.notaReprogramacion && (
                                        <div className="flex items-start gap-2 opacity-70">
                                          <StickyNote size={14} className="mt-0.5 shrink-0" />
                                          <span>{item.notaReprogramacion}</span>
                                        </div>
                                      )}

                                      {estaTemprano && (
                                        <div
                                          className="flex items-start gap-2 rounded-2xl px-3 py-2 text-sm"
                                          style={{
                                            backgroundColor: "#eff6ff",
                                            color: "#1d4ed8",
                                          }}
                                        >
                                          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                                          <span>
                                            Si cobras hoy, el sistema te pedirá confirmación porque la
                                            fecha pactada aún no llega.
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  <div className="lg:min-w-[220px] lg:text-right">
                                    <p className="text-2xl font-bold" style={{ color: "var(--primary)" }}>
                                      Q{formatearMoneda(item.montoPendienteCuota)}
                                    </p>
                                    <p className="text-sm opacity-60">Pendiente de esta cuota</p>
                                    {Number(item.montoPendienteCuota) < Number(item.montoCuota) && (
                                      <p className="text-sm text-amber-500 font-semibold mt-1">
                                        Cuota parcial. Total original: Q{formatearMoneda(item.montoCuota)}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                <div className="flex flex-col xl:flex-row xl:items-center gap-2 mt-5">
                                  <button
                                    onClick={() => registrarPagoCompleto(item)}
                                    disabled={registrando === item.prestamoId}
                                    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-white hover:opacity-90 disabled:opacity-50"
                                    style={{ backgroundColor: "#16a34a" }}
                                  >
                                    <Check size={16} />
                                    {registrando === item.prestamoId
                                      ? "Registrando..."
                                      : `Efectuar pago completo`}
                                  </button>

                                  <button
                                    onClick={() => abrirModal(item, "pago_parcial")}
                                    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-white hover:opacity-90"
                                    style={{ backgroundColor: "#d97706" }}
                                  >
                                    <HandCoins size={15} />
                                    Pago parcial
                                  </button>

                                  <button
                                    onClick={() => abrirModal(item, "no_pago")}
                                    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-white hover:opacity-90"
                                    style={{ backgroundColor: "#dc2626" }}
                                  >
                                    <X size={15} />
                                    No pago
                                  </button>

                                  <div className="xl:ml-auto text-sm opacity-60 flex items-center gap-2">
                                    <ChevronRight size={15} />
                                    {item.cliente.zona || item.cliente.direccion || "Sin direccion"}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            ) : (
              <div
                className="rounded-[28px] p-12 text-center shadow-sm"
                style={{ backgroundColor: "var(--card)", border: "1px solid var(--card-border)" }}
              >
                <div className="flex justify-center mb-4">
                  <CalendarDays size={52} className="opacity-35" />
                </div>
                <p className="text-2xl font-bold">No hay cobros en este mes</p>
                <p className="text-sm opacity-60 mt-2">
                  No existen cuotas pendientes ni reprogramaciones dentro de {datos.mesLabel}.
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {modalItem && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          style={{ backgroundColor: "rgba(0,0,0,0.52)", backdropFilter: "blur(4px)" }}
          onClick={cerrarModal}
        >
          <div
            className="w-full sm:max-w-md mx-0 sm:mx-4 rounded-t-3xl sm:rounded-3xl shadow-2xl p-6"
            style={{
              backgroundColor: "var(--card)",
              border: "1px solid var(--card-border)",
              animation: "slideUp 0.25s ease-out",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-bold text-base flex items-center gap-2">
                  {modalTipo === "no_pago" ? (
                    <>
                      <X size={16} className="text-red-500" /> No pago
                    </>
                  ) : (
                    <>
                      <HandCoins size={16} className="text-amber-500" /> Pago parcial
                    </>
                  )}
                </h2>
                <p className="text-xs opacity-50 mt-0.5">
                  {modalItem.cliente.nombres} {modalItem.cliente.apellidos}
                </p>
              </div>
              <button
                onClick={cerrarModal}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:opacity-70"
                style={{ backgroundColor: "var(--bg)", color: "var(--text)" }}
              >
                <X size={15} />
              </button>
            </div>

            <div className="space-y-4">
              {modalTipo === "pago_parcial" && (
                <div>
                  <label className="text-sm font-semibold block mb-1" style={{ color: "var(--text)" }}>
                    Monto recibido
                    <span className="font-normal opacity-50 ml-1">
                      (pendiente: Q{formatearMoneda(modalItem.montoPendienteCuota)})
                    </span>
                  </label>
                  <input
                    type="number"
                    placeholder="Ej: 150.00"
                    value={montoParcial}
                    onChange={(e) => setMontoParcial(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl outline-none"
                    style={inputStyle}
                    min="1"
                    max={Math.max(Number(modalItem.montoPendienteCuota) - 0.01, 0)}
                    step="0.01"
                  />
                </div>
              )}

              <div>
                <label className="text-sm font-semibold block mb-1" style={{ color: "var(--text)" }}>
                  Nota
                </label>
                <textarea
                  placeholder={
                    modalTipo === "no_pago"
                      ? "Ej: El cliente no estaba, pidio reprogramar..."
                      : "Ej: Solo entrego una parte, queda pendiente el resto..."
                  }
                  value={notaSeguimiento}
                  onChange={(e) => setNotaSeguimiento(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-xl outline-none resize-none text-sm"
                  style={inputStyle}
                />
              </div>

              <div>
                <label
                  className="flex items-center gap-1 text-sm font-semibold mb-1"
                  style={{ color: "var(--text)" }}
                >
                  <CalendarDays size={14} style={{ color: "var(--primary)" }} />
                  Fecha para cobrar de nuevo
                </label>
                <input
                  type="date"
                  value={fechaProgramada}
                  onChange={(e) => setFechaProgramada(e.target.value)}
                  min={hoyISO()}
                  className="w-full px-3 py-2.5 rounded-xl outline-none"
                  style={inputStyle}
                />
              </div>

              <button
                onClick={guardarGestion}
                disabled={guardandoSeguimiento}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-white hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: modalTipo === "no_pago" ? "#dc2626" : "#d97706" }}
              >
                <Check size={16} />
                {guardandoSeguimiento ? "Guardando..." : "Guardar gestion"}
              </button>

              <button
                onClick={cerrarModal}
                className="w-full py-2.5 rounded-xl font-semibold text-sm hover:opacity-70"
                style={{
                  backgroundColor: "var(--bg)",
                  color: "var(--text)",
                  border: "1px solid var(--card-border)",
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {toast && <Toast message={toast.message} type={toast.type} onClose={closeToast} />}
    </div>
  );
}
