import { useState, useEffect } from "react";
import useToast from "../hooks/useToast";
import Toast from "../components/Toast";
import {
  MapPin, RefreshCw, ListOrdered, Check, X,
  Phone, Clock, CheckCircle2, HandCoins,
  ChevronUp, ChevronDown, PartyPopper,
  AlertTriangle, StickyNote, CalendarDays, Ban
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3333";

// ← FIX: usar zona horaria de Guatemala en lugar de UTC del navegador
const hoyISO = () => new Date().toLocaleDateString("sv-SE", { timeZone: "America/Guatemala" });

export default function RutaDelDia() {
  const [datos, setDatos] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [registrando, setRegistrando] = useState(null);
  const [editandoOrden, setEditandoOrden] = useState(false);
  const [prioridades, setPrioridades] = useState({});
  const [guardandoOrden, setGuardandoOrden] = useState(false);

  // Modal seguimiento
  const [modalItem, setModalItem] = useState(null);
  const [modalTipo, setModalTipo] = useState(null);
  const [montoParcial, setMontoParcial] = useState("");
  const [notaSeguimiento, setNotaSeguimiento] = useState("");
  const [fechaSeguimiento, setFechaSeguimiento] = useState(hoyISO());
  const [guardandoSeguimiento, setGuardandoSeguimiento] = useState(false);

  const { toast, showToast, closeToast } = useToast();
  const diasSemana = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];
  const hoyNombre = diasSemana[new Date().getDay()];
  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const cargarRuta = async () => {
    try {
      const res = await fetch(`${API_URL}/api/rutas/hoy`, { headers });
      const data = await res.json();
      if (!res.ok) { setError(data.message || "Error al cargar ruta"); return; }
      setDatos(data);
    } catch {
      setError("No se pudo conectar con el servidor");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargarRuta(); }, []);

  useEffect(() => {
    document.body.style.overflow = modalItem ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [modalItem]);

  const abrirModal = (item, tipo) => {
    setModalItem(item);
    setModalTipo(tipo);
    setMontoParcial("");
    setNotaSeguimiento("");
    setFechaSeguimiento(hoyISO());
  };

  const cerrarModal = () => { setModalItem(null); setModalTipo(null); };

  // ── Cobro completo ───────────────────────────────────────────────────────────
  const registrarPago = async (item) => {
    if (!window.confirm(`¿Registrar pago de Q${Number(item.montoCuota).toFixed(2)} para ${item.cliente.nombres}?`)) return;
    setRegistrando(item.prestamoId);

    setDatos(prev => ({
      ...prev,
      totalPendientes: prev.totalPendientes - 1,
      totalCobrados: prev.totalCobrados + 1,
      totalRecaudado: prev.totalRecaudado + item.montoCuota,
      pendientes: prev.pendientes.filter(p => p.prestamoId !== item.prestamoId),
      cobrados: [...prev.cobrados, { ...item, yaPagoHoy: true }],
    }));

    try {
      const res = await fetch(`${API_URL}/api/pagos`, {
        method: "POST", headers,
        body: JSON.stringify({
          prestamoId: item.prestamoId,
          numeroCuota: item.proximaCuota,
          montoPagado: item.montoCuota,
          fechaPago: hoyISO(),
        }),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.message || "Error al registrar pago", "error"); cargarRuta(); return; }
      showToast(`Cuota #${item.proximaCuota} de ${item.cliente.nombres} registrada`, "success");
    } catch {
      showToast("Error al registrar pago", "error");
      cargarRuta();
    } finally {
      setRegistrando(null);
    }
  };

  // ── Guardar seguimiento ──────────────────────────────────────────────────────
  const guardarSeguimiento = async () => {
    if (!fechaSeguimiento) { showToast("Selecciona una fecha de seguimiento", "error"); return; }
    if (modalTipo === "pago_parcial") {
      const monto = Number(montoParcial);
      if (!monto || monto <= 0) { showToast("Ingresa el monto pagado", "error"); return; }
      if (monto >= modalItem.montoCuota) {
        showToast("El monto parcial debe ser menor a la cuota completa", "error"); return;
      }
    }

    setGuardandoSeguimiento(true);
    try {
      if (modalTipo === "pago_parcial") {
        const resPago = await fetch(`${API_URL}/api/pagos`, {
          method: "POST", headers,
          body: JSON.stringify({
            prestamoId: modalItem.prestamoId,
            numeroCuota: modalItem.proximaCuota,
            montoPagado: Number(montoParcial),
            fechaPago: hoyISO(),
          }),
        });
        if (!resPago.ok) {
          const d = await resPago.json();
          showToast(d.message || "Error al registrar pago parcial", "error");
          setGuardandoSeguimiento(false);
          return;
        }
      }

      const resSeg = await fetch(`${API_URL}/api/seguimientos`, {
        method: "POST", headers,
        body: JSON.stringify({
          prestamoId: modalItem.prestamoId,
          tipo: modalTipo,
          montoPagado: modalTipo === "pago_parcial" ? Number(montoParcial) : 0,
          nota: notaSeguimiento || null,
          fechaSeguimiento,
        }),
      });

      const dataSeg = await resSeg.json();
      if (!resSeg.ok) { showToast(dataSeg.message || "Error al guardar seguimiento", "error"); return; }

      const nuevoSinCobrar = {
        prestamoId:      modalItem.prestamoId,
        seguimientoId:   dataSeg.seguimiento?.id || null,
        tipo:            modalTipo,
        montoPagado:     modalTipo === "pago_parcial" ? Number(montoParcial) : 0,
        nota:            notaSeguimiento || null,
        fechaSeguimiento,
        rutaNombre:      modalItem.rutaNombre,
        cliente:         modalItem.cliente,
        montoCuota:      modalItem.montoCuota,
      };

      setDatos(prev => ({
        ...prev,
        totalPendientes: prev.totalPendientes - 1,
        totalSinCobrar: (prev.totalSinCobrar || 0) + 1,
        pendientes: prev.pendientes.filter(p => p.prestamoId !== modalItem.prestamoId),
        sinCobrar: [...(prev.sinCobrar || []), nuevoSinCobrar],
      }));

      const msg = modalTipo === "no_pago"
        ? `No pago registrado — se reagendó para ${fechaSeguimiento}`
        : `Pago parcial de Q${montoParcial} registrado — seguimiento el ${fechaSeguimiento}`;
      showToast(msg, "success");
      cerrarModal();
    } catch {
      showToast("Error al guardar seguimiento", "error");
    } finally {
      setGuardandoSeguimiento(false);
    }
  };

  // ── Orden ────────────────────────────────────────────────────────────────────
  const iniciarEdicionOrden = () => {
    const p = {};
    datos?.pendientes?.forEach((item, i) => { p[item.prestamoId] = item.cliente.ordenVisita || i + 1; });
    setPrioridades(p);
    setEditandoOrden(true);
  };

  const guardarOrden = async () => {
    setGuardandoOrden(true);
    try {
      const ordenes = Object.entries(prioridades).map(([prestamoId, orden]) => {
        const item = datos.pendientes.find(p => p.prestamoId === Number(prestamoId));
        return { id: item?.cliente?.id, ordenVisita: Number(orden) };
      }).filter(o => o.id);
      await fetch(`${API_URL}/api/clientes/ordenar`, { method: "PUT", headers, body: JSON.stringify({ ordenes }) });
      const pendientesOrdenados = [...datos.pendientes].sort((a, b) =>
        (prioridades[a.prestamoId] || 0) - (prioridades[b.prestamoId] || 0)
      );
      setDatos(prev => ({ ...prev, pendientes: pendientesOrdenados }));
      setEditandoOrden(false);
      showToast("Orden guardado correctamente", "success");
    } catch { showToast("Error al guardar orden", "error"); }
    finally { setGuardandoOrden(false); }
  };

  const moverCliente = async (index, direccion) => {
    const pendientes = [...datos.pendientes];
    const nuevoIndex = direccion === "up" ? index - 1 : index + 1;
    if (nuevoIndex < 0 || nuevoIndex >= pendientes.length) return;
    [pendientes[index], pendientes[nuevoIndex]] = [pendientes[nuevoIndex], pendientes[index]];
    const conOrden = pendientes.map((p, i) => ({ ...p, cliente: { ...p.cliente, ordenVisita: i + 1 } }));
    setDatos(prev => ({ ...prev, pendientes: conOrden }));
    try {
      await fetch(`${API_URL}/api/clientes/ordenar`, {
        method: "PUT", headers,
        body: JSON.stringify({ ordenes: conOrden.map(p => ({ id: p.cliente.id, ordenVisita: p.cliente.ordenVisita })) }),
      });
    } catch { showToast("Error al guardar orden", "error"); }
  };

  const agruparPorRuta = (items) => items.reduce((grupos, item) => {
    const key = item.rutaNombre || "Sin zona asignada";
    if (!grupos[key]) grupos[key] = [];
    grupos[key].push(item);
    return grupos;
  }, {});

  const inputStyle = { backgroundColor: "var(--bg)", color: "var(--text)", border: "1px solid var(--card-border)" };

  return (
    <div className="pt-16 text-[var(--text)]">
      <div className="max-w-5xl mx-auto">

        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold">
              <MapPin size={24} style={{ color: "var(--primary)" }} /> Ruta de Hoy
            </h1>
            <p className="text-sm opacity-60 mt-1">{hoyNombre} — {new Date().toLocaleDateString("es-GT")}</p>
          </div>
          <div className="flex gap-2">
            {!editandoOrden ? (
              <>
                <button onClick={iniciarEdicionOrden}
                  className="flex items-center gap-2 text-white px-4 py-2 rounded-lg shadow hover:opacity-90 text-sm font-semibold"
                  style={{ backgroundColor: "var(--secondary)" }}>
                  <ListOrdered size={16} /> Ordenar
                </button>
                <button onClick={() => { setLoading(true); setError(""); cargarRuta(); }}
                  className="flex items-center gap-2 text-white px-4 py-2 rounded-lg shadow hover:opacity-90"
                  style={{ backgroundColor: "var(--primary)" }}>
                  <RefreshCw size={16} /> Actualizar
                </button>
              </>
            ) : (
              <>
                <button onClick={guardarOrden} disabled={guardandoOrden}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-white font-semibold hover:opacity-90 disabled:opacity-50 bg-green-500">
                  <Check size={16} /> Aplicar
                </button>
                <button onClick={() => setEditandoOrden(false)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-white font-semibold hover:opacity-90 bg-red-400">
                  <X size={16} /> Cancelar
                </button>
              </>
            )}
          </div>
        </div>

        {loading && <p className="opacity-60">Cargando ruta...</p>}
        {error && <p className="text-red-500">{error}</p>}

        {!loading && datos && (
          <>
            {/* RESUMEN */}
            <div className={`grid gap-3 mb-8 ${datos.totalSinCobrar > 0 ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-3'}`}>
              <div className="relative overflow-hidden p-4 rounded-2xl shadow flex flex-col items-center justify-center"
                style={{ backgroundColor: "var(--card)", border: "1px solid var(--card-border)" }}>
                <div className="absolute inset-0 opacity-5" style={{ backgroundColor: "var(--primary)" }} />
                <Clock size={20} className="mb-1 opacity-40" />
                <p className="text-3xl font-bold" style={{ color: "var(--primary)" }}>{datos.totalPendientes}</p>
                <p className="text-xs opacity-60 mt-1 font-medium">Pendientes</p>
              </div>
              <div className="relative overflow-hidden p-4 rounded-2xl shadow flex flex-col items-center justify-center"
                style={{ backgroundColor: "var(--card)", border: "1px solid var(--card-border)" }}>
                <div className="absolute inset-0 opacity-5" style={{ backgroundColor: "#16a34a" }} />
                <CheckCircle2 size={20} className="mb-1 text-green-500 opacity-60" />
                <p className="text-3xl font-bold text-green-500">{datos.totalCobrados}</p>
                <p className="text-xs opacity-60 mt-1 font-medium">Cobrados</p>
              </div>
              {datos.totalSinCobrar > 0 && (
                <div className="relative overflow-hidden p-4 rounded-2xl shadow flex flex-col items-center justify-center"
                  style={{ backgroundColor: "var(--card)", border: "1px solid var(--card-border)" }}>
                  <div className="absolute inset-0 opacity-5" style={{ backgroundColor: "#dc2626" }} />
                  <Ban size={20} className="mb-1 text-red-500 opacity-60" />
                  <p className="text-3xl font-bold text-red-500">{datos.totalSinCobrar}</p>
                  <p className="text-xs opacity-60 mt-1 font-medium">Sin cobrar</p>
                </div>
              )}
              <div className="relative overflow-hidden p-4 rounded-2xl shadow flex flex-col items-center justify-center"
                style={{ backgroundColor: "var(--card)", border: "1px solid var(--card-border)" }}>
                <div className="absolute inset-0 opacity-5" style={{ backgroundColor: "#16a34a" }} />
                <HandCoins size={20} className="mb-1 text-green-500 opacity-60" />
                <p className="text-xl font-bold text-green-500">Q{Number(datos.totalRecaudado).toFixed(2)}</p>
                <p className="text-xs opacity-60 mt-1 font-medium">Recaudado</p>
              </div>
            </div>

            {/* PENDIENTES */}
            {datos.pendientes?.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="flex items-center gap-2 text-lg font-bold">
                    <Clock size={18} className="opacity-60" /> Pendientes
                  </h2>
                  {editandoOrden && <p className="text-sm opacity-60">Usa ↑↓ para ordenar</p>}
                </div>

                {Object.entries(agruparPorRuta(datos.pendientes)).map(([zona, items]) => (
                  <div key={zona} className="mb-8">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="h-px flex-1" style={{ backgroundColor: "var(--card-border)" }} />
                      <div className="flex items-center gap-2 px-4 py-1.5 rounded-full text-white text-sm font-bold shadow-lg"
                        style={{ background: "linear-gradient(135deg, var(--secondary), var(--primary))", boxShadow: "0 2px 12px rgba(37,99,235,0.35)" }}>
                        <MapPin size={13} />
                        {zona}
                        <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-semibold"
                          style={{ backgroundColor: "rgba(255,255,255,0.2)" }}>
                          {items.length} cobro{items.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="h-px flex-1" style={{ backgroundColor: "var(--card-border)" }} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {items.map((item, index) => {
                        const globalIndex = datos.pendientes.findIndex(p => p.prestamoId === item.prestamoId);
                        return (
                          <div key={item.prestamoId} className="rounded-2xl shadow-md p-4"
                            style={{ backgroundColor: "var(--card)", border: `2px solid ${item.esSeguimiento ? "#d97706" : "var(--primary)"}` }}>

                            {item.esSeguimiento && (
                              <div className="flex items-center gap-1 text-xs font-semibold text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-lg w-fit mb-2">
                                <AlertTriangle size={11} />
                                Seguimiento — {item.seguimientoTipo === "no_pago" ? "No pagó" : "Pago parcial"}
                              </div>
                            )}
                            {item.seguimientoNota && (
                              <div className="flex items-start gap-1 text-xs opacity-60 mb-2 italic">
                                <StickyNote size={11} className="mt-0.5 shrink-0" />
                                {item.seguimientoNota}
                              </div>
                            )}

                            <div className="flex items-start gap-3">
                              <div className="flex flex-col items-center gap-1 shrink-0">
                                {editandoOrden ? (
                                  <>
                                    <button onClick={() => moverCliente(globalIndex, "up")} disabled={globalIndex === 0}
                                      className="w-8 h-8 rounded-lg text-white flex items-center justify-center hover:opacity-90 disabled:opacity-30"
                                      style={{ backgroundColor: "var(--secondary)" }}>
                                      <ChevronUp size={16} />
                                    </button>
                                    <input type="number" min="1"
                                      value={prioridades[item.prestamoId] || ""}
                                      onChange={e => setPrioridades({ ...prioridades, [item.prestamoId]: Number(e.target.value) })}
                                      className="w-8 text-center p-1 rounded font-bold text-sm"
                                      style={{ backgroundColor: "var(--bg)", color: "var(--text)", border: "2px solid var(--primary)" }} />
                                    <button onClick={() => moverCliente(globalIndex, "down")} disabled={globalIndex === datos.pendientes.length - 1}
                                      className="w-8 h-8 rounded-lg text-white flex items-center justify-center hover:opacity-90 disabled:opacity-30"
                                      style={{ backgroundColor: "var(--secondary)" }}>
                                      <ChevronDown size={16} />
                                    </button>
                                  </>
                                ) : (
                                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                                    style={{ backgroundColor: item.esSeguimiento ? "#d97706" : "var(--primary)" }}>
                                    {index + 1}
                                  </div>
                                )}
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start mb-2">
                                  <div>
                                    <h3 className="font-bold text-base truncate">{item.cliente.nombres} {item.cliente.apellidos}</h3>
                                    <p className="flex items-center gap-1 text-sm opacity-60"><MapPin size={12} />{item.cliente.zona || item.cliente.direccion}</p>
                                    <p className="flex items-center gap-1 text-sm opacity-60"><Phone size={12} />{item.cliente.telefono}</p>
                                  </div>
                                  <div className="text-right shrink-0 ml-2">
                                    <p className="text-xl font-bold" style={{ color: "var(--primary)" }}>Q{Number(item.montoCuota).toFixed(2)}</p>
                                    <p className="text-xs opacity-60">Cuota {item.proximaCuota}/{item.totalCuotas}</p>
                                  </div>
                                </div>

                                <div className="w-full bg-gray-200 rounded-full h-1.5 mb-3">
                                  <div className="h-1.5 rounded-full"
                                    style={{ width: `${Math.round((item.cuotasPagadas / item.totalCuotas) * 100)}%`, backgroundColor: "var(--primary)" }} />
                                </div>

                                {!editandoOrden && (
                                  <div className="flex flex-col gap-2">
                                    <button onClick={() => registrarPago(item)} disabled={registrando === item.prestamoId}
                                      className="w-full flex items-center justify-center gap-2 py-2 rounded-xl font-semibold text-white hover:opacity-90 disabled:opacity-50"
                                      style={{ backgroundColor: "#16a34a" }}>
                                      <HandCoins size={16} />
                                      {registrando === item.prestamoId ? "Registrando..." : `Cobro completo — Q${Number(item.montoCuota).toFixed(2)}`}
                                    </button>
                                    <div className="grid grid-cols-2 gap-2">
                                      <button onClick={() => abrirModal(item, "pago_parcial")}
                                        className="flex items-center justify-center gap-1 py-2 rounded-xl font-semibold text-white text-sm hover:opacity-90"
                                        style={{ backgroundColor: "#d97706" }}>
                                        <HandCoins size={14} /> Pago parcial
                                      </button>
                                      <button onClick={() => abrirModal(item, "no_pago")}
                                        className="flex items-center justify-center gap-1 py-2 rounded-xl font-semibold text-white text-sm hover:opacity-90"
                                        style={{ backgroundColor: "#dc2626" }}>
                                        <X size={14} /> No pagó
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* SIN COBRAR HOY */}
            {datos.sinCobrar?.length > 0 && (
              <div className="mb-8">
                <h2 className="flex items-center gap-2 text-lg font-bold mb-5">
                  <Ban size={18} className="text-red-500" /> Sin cobrar hoy
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {datos.sinCobrar.map((item) => (
                    <div key={item.prestamoId} className="rounded-2xl shadow-md p-4 opacity-80"
                      style={{ backgroundColor: "var(--card)", border: "2px solid #dc2626" }}>
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-bold text-base">{item.cliente.nombres} {item.cliente.apellidos}</h3>
                          <p className="flex items-center gap-1 text-sm opacity-60"><MapPin size={12} />{item.cliente.zona || item.cliente.direccion}</p>
                          <p className="flex items-center gap-1 text-sm opacity-60"><Phone size={12} />{item.cliente.telefono}</p>
                        </div>
                        <div className="text-right shrink-0 ml-2">
                          <span className={`text-xs px-2 py-1 rounded-full font-semibold text-white ${item.tipo === "no_pago" ? "bg-red-500" : "bg-amber-500"}`}>
                            {item.tipo === "no_pago" ? "No pagó" : "Pago parcial"}
                          </span>
                          {item.tipo === "pago_parcial" && (
                            <p className="text-xs opacity-60 mt-1">Pagó Q{Number(item.montoPagado).toFixed(2)}</p>
                          )}
                        </div>
                      </div>
                      {item.nota && (
                        <div className="flex items-start gap-1 text-xs opacity-60 mb-2 italic bg-gray-50 dark:bg-white/5 rounded-lg p-2">
                          <StickyNote size={11} className="mt-0.5 shrink-0" />
                          {item.nota}
                        </div>
                      )}
                      <div className="flex items-center gap-1 text-xs font-semibold mt-1" style={{ color: "var(--secondary)" }}>
                        <CalendarDays size={12} />
                        Próxima visita: {item.fechaSeguimiento}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* COBRADOS */}
            {datos.cobrados?.length > 0 && (
              <div>
                <h2 className="flex items-center gap-2 text-lg font-bold mb-5">
                  <CheckCircle2 size={18} className="text-green-500" /> Cobrados hoy
                </h2>
                {Object.entries(agruparPorRuta(datos.cobrados)).map(([zona, items]) => (
                  <div key={zona} className="mb-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="h-px flex-1" style={{ backgroundColor: "var(--card-border)" }} />
                      <div className="flex items-center gap-2 px-4 py-1.5 rounded-full text-white text-sm font-bold shadow"
                        style={{ background: "linear-gradient(135deg, #16a34a, #15803d)", boxShadow: "0 2px 12px rgba(22,163,74,0.35)" }}>
                        <CheckCircle2 size={13} />
                        {zona}
                        <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-semibold"
                          style={{ backgroundColor: "rgba(255,255,255,0.2)" }}>
                          {items.length} cobro{items.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="h-px flex-1" style={{ backgroundColor: "var(--card-border)" }} />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {items.map((item) => (
                        <div key={item.prestamoId} className="rounded-2xl shadow-md p-4 opacity-60"
                          style={{ backgroundColor: "var(--card)", border: "2px solid #16a34a" }}>
                          <div className="flex justify-between items-center">
                            <div>
                              <h3 className="flex items-center gap-1 font-bold text-sm">
                                <CheckCircle2 size={13} className="text-green-500" />
                                {item.cliente.nombres} {item.cliente.apellidos}
                              </h3>
                              <p className="flex items-center gap-1 text-xs opacity-60 mt-0.5">
                                <MapPin size={11} />{item.cliente.zona || item.cliente.direccion}
                              </p>
                            </div>
                            <p className="font-bold text-green-500">Q{Number(item.montoCuota).toFixed(2)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* SIN COBROS */}
            {datos.totalPendientes === 0 && datos.totalCobrados === 0 && !datos.sinCobrar?.length && (
              <div className="rounded-2xl p-10 text-center shadow"
                style={{ backgroundColor: "var(--card)", border: "1px solid var(--card-border)" }}>
                <div className="flex justify-center mb-4"><PartyPopper size={48} className="opacity-40" /></div>
                <p className="text-xl font-bold">¡No hay cobros para hoy!</p>
                <p className="text-sm opacity-60 mt-1">No hay ventas con visita programada para {hoyNombre}.</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* MODAL SEGUIMIENTO */}
      {modalItem && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          style={{ backgroundColor: "rgba(0,0,0,0.5)", backdropFilter: "blur(3px)" }}
          onClick={cerrarModal}>
          <div className="w-full sm:max-w-sm mx-0 sm:mx-4 rounded-t-3xl sm:rounded-3xl shadow-2xl p-6"
            style={{ backgroundColor: "var(--card)", border: "1px solid var(--card-border)", animation: "slideUp 0.25s ease-out" }}
            onClick={e => e.stopPropagation()}>

            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-bold text-base flex items-center gap-2">
                  {modalTipo === "no_pago"
                    ? <><X size={16} className="text-red-500" /> No pagó</>
                    : <><HandCoins size={16} className="text-amber-500" /> Pago parcial</>}
                </h2>
                <p className="text-xs opacity-50 mt-0.5">{modalItem.cliente.nombres} {modalItem.cliente.apellidos}</p>
              </div>
              <button onClick={cerrarModal}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:opacity-70"
                style={{ backgroundColor: "var(--bg)", color: "var(--text)" }}>
                <X size={15} />
              </button>
            </div>

            <div className="space-y-4">
              {modalTipo === "pago_parcial" && (
                <div>
                  <label className="text-sm font-semibold block mb-1" style={{ color: "var(--text)" }}>
                    Monto recibido
                    <span className="font-normal opacity-50 ml-1">(cuota: Q{Number(modalItem.montoCuota).toFixed(2)})</span>
                  </label>
                  <input type="number" placeholder="Ej: 150.00"
                    value={montoParcial} onChange={e => setMontoParcial(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl outline-none"
                    style={inputStyle} min="1" max={modalItem.montoCuota - 0.01} step="0.01" />
                </div>
              )}

              <div>
                <label className="text-sm font-semibold block mb-1" style={{ color: "var(--text)" }}>
                  Nota <span className="font-normal opacity-50">(opcional)</span>
                </label>
                <textarea
                  placeholder={modalTipo === "no_pago"
                    ? "Ej: No estaba en casa, acordó pagar el jueves..."
                    : "Ej: Solo tenía Q150, el resto lo da el miércoles..."}
                  value={notaSeguimiento} onChange={e => setNotaSeguimiento(e.target.value)}
                  rows={3} className="w-full px-3 py-2.5 rounded-xl outline-none resize-none text-sm"
                  style={inputStyle} />
              </div>

              <div>
                <label className="flex items-center gap-1 text-sm font-semibold mb-1" style={{ color: "var(--text)" }}>
                  <CalendarDays size={14} style={{ color: "var(--primary)" }} />
                  ¿Cuándo volver a pasar?
                </label>
                <input type="date" value={fechaSeguimiento}
                  onChange={e => setFechaSeguimiento(e.target.value)}
                  min={hoyISO()} className="w-full px-3 py-2.5 rounded-xl outline-none"
                  style={inputStyle} />
              </div>

              <button onClick={guardarSeguimiento} disabled={guardandoSeguimiento}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-white hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: modalTipo === "no_pago" ? "#dc2626" : "#d97706" }}>
                <Check size={16} />
                {guardandoSeguimiento ? "Guardando..." : "Guardar y continuar"}
              </button>
              <button onClick={cerrarModal}
                className="w-full py-2.5 rounded-xl font-semibold text-sm hover:opacity-70"
                style={{ backgroundColor: "var(--bg)", color: "var(--text)", border: "1px solid var(--card-border)" }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {toast && <Toast message={toast.message} type={toast.type} onClose={closeToast} />}
    </div>
  );
}
