import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Download, Printer, RefreshCw } from "lucide-react";
import { authFetch } from "../services/api";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3333";

const moneda = (valor) =>
  Number(valor || 0).toLocaleString("es-GT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const fecha = (valor) => {
  if (!valor) return "N/A";
  const [year, month, day] = String(valor).split("T")[0].split("-");
  return `${day}/${month}/${year}`;
};

const etiquetaPago = (pago) => {
  if (pago.tipoPago === "enganche") return "Enganche";
  if (pago.tipoPago === "abono") return "Abono";
  return `Cuota #${pago.numeroCuota}`;
};

const cargarImagen = (src) =>
  new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });

const truncar = (texto, max = 34) => {
  const value = String(texto || "");
  return value.length > max ? `${value.slice(0, max - 1)}...` : value;
};

function dibujarTexto(ctx, texto, x, y, opciones = {}) {
  const {
    color = "#0f172a",
    size = 28,
    weight = "400",
    align = "left",
    maxWidth,
  } = opciones;
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px Arial`;
  ctx.textAlign = align;
  ctx.fillText(texto, x, y, maxWidth);
}

function rectRedondeado(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

async function descargarEstadoJpg(estado, nombreCliente, movimientos) {
  const width = 1080;
  const height = 1720;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#f8fafc";
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "#0f172a";
  rectRedondeado(ctx, 44, 44, width - 88, height - 88, 34);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  rectRedondeado(ctx, 64, 64, width - 128, height - 128, 30);
  ctx.fill();

  const logo = await cargarImagen("/logo.jpeg");
  if (logo) {
    ctx.save();
    rectRedondeado(ctx, 92, 96, 116, 116, 28);
    ctx.clip();
    ctx.drawImage(logo, 92, 96, 116, 116);
    ctx.restore();
  }

  dibujarTexto(ctx, "Villas del Rosario", 232, 138, {
    size: 38,
    weight: "700",
  });
  dibujarTexto(ctx, "Estado de cuenta", 232, 178, {
    size: 25,
    color: "#64748b",
  });
  dibujarTexto(ctx, fecha(estado.generadoEn), 988, 136, {
    size: 23,
    color: "#64748b",
    align: "right",
  });

  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(92, 246);
  ctx.lineTo(988, 246);
  ctx.stroke();

  dibujarTexto(ctx, truncar(nombreCliente, 36), 92, 310, {
    size: 40,
    weight: "700",
  });
  dibujarTexto(ctx, `Tel. ${estado.cliente.telefono || "N/A"}`, 92, 350, {
    size: 24,
    color: "#475569",
  });
  dibujarTexto(ctx, truncar(estado.cliente.direccion || "Sin direccion", 54), 92, 386, {
    size: 24,
    color: "#475569",
  });

  const cards = [
    ["Total vendido", `Q${moneda(estado.resumen.totalVendido)}`, "#eff6ff", "#1d4ed8"],
    ["Total pagado", `Q${moneda(estado.resumen.totalPagado)}`, "#ecfdf5", "#047857"],
    ["Saldo pendiente", `Q${moneda(estado.resumen.saldoPendiente)}`, "#fffbeb", "#b45309"],
    ["Cuotas en mora", String(estado.resumen.cuotasEnMora), "#fef2f2", "#b91c1c"],
  ];

  cards.forEach(([label, value, bg, color], index) => {
    const x = 92 + (index % 2) * 456;
    const y = 444 + Math.floor(index / 2) * 144;
    ctx.fillStyle = bg;
    rectRedondeado(ctx, x, y, 420, 112, 22);
    ctx.fill();
    dibujarTexto(ctx, label, x + 24, y + 38, { size: 21, color });
    dibujarTexto(ctx, value, x + 24, y + 82, { size: 30, weight: "700", color });
  });

  dibujarTexto(ctx, "Ventas", 92, 770, { size: 30, weight: "700" });
  let y = 820;
  estado.ventas.slice(0, 4).forEach((venta) => {
    ctx.fillStyle = "#f8fafc";
    rectRedondeado(ctx, 92, y, 896, 118, 22);
    ctx.fill();
    dibujarTexto(ctx, `Lote ${venta.lote}`, 120, y + 38, { size: 27, weight: "700" });
    dibujarTexto(ctx, `${venta.cuotasPagadas}/${venta.totalCuotas} cuotas`, 120, y + 76, {
      size: 22,
      color: "#64748b",
    });
    dibujarTexto(ctx, `Saldo Q${moneda(venta.saldoPendiente)}`, 956, y + 48, {
      size: 25,
      weight: "700",
      color: Number(venta.saldoPendiente) > 0 ? "#b45309" : "#047857",
      align: "right",
    });
    dibujarTexto(ctx, venta.estado, 956, y + 84, {
      size: 21,
      color: "#64748b",
      align: "right",
    });
    y += 136;
  });

  if (estado.ventas.length > 4) {
    dibujarTexto(ctx, `+ ${estado.ventas.length - 4} venta(s) adicional(es)`, 92, y + 10, {
      size: 22,
      color: "#64748b",
    });
    y += 44;
  }

  y += 14;
  dibujarTexto(ctx, "Ultimos movimientos", 92, y, { size: 30, weight: "700" });
  y += 48;
  movimientos.slice(0, 7).forEach((pago) => {
    ctx.strokeStyle = "#e2e8f0";
    ctx.beginPath();
    ctx.moveTo(92, y + 12);
    ctx.lineTo(988, y + 12);
    ctx.stroke();
    dibujarTexto(ctx, `${fecha(pago.fechaPago)} · ${etiquetaPago(pago)}`, 92, y + 52, {
      size: 24,
      color: "#334155",
    });
    dibujarTexto(ctx, `Q${moneda(pago.montoPagado)}`, 988, y + 52, {
      size: 25,
      weight: "700",
      color: "#047857",
      align: "right",
    });
    y += 70;
  });

  if (movimientos.length === 0) {
    dibujarTexto(ctx, "Sin pagos registrados.", 92, y + 38, {
      size: 24,
      color: "#64748b",
    });
  }

  ctx.fillStyle = "#0f172a";
  rectRedondeado(ctx, 92, 1574, 896, 64, 18);
  ctx.fill();
  dibujarTexto(ctx, "Documento informativo generado por Villas del Rosario", 540, 1615, {
    size: 22,
    color: "#ffffff",
    align: "center",
  });

  const link = document.createElement("a");
  link.download = `estado_cuenta_${nombreCliente.replace(/\s+/g, "_").toLowerCase()}.jpg`;
  link.href = canvas.toDataURL("image/jpeg", 0.92);
  link.click();
}

export default function EstadoCuentaCliente() {
  const { clienteId } = useParams();
  const navigate = useNavigate();
  const [estado, setEstado] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [descargando, setDescargando] = useState(false);

  const cargarEstado = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await authFetch(`${API_URL}/api/clientes/${clienteId}/estado-cuenta`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "No se pudo cargar el estado de cuenta");
        return;
      }
      setEstado(data);
    } catch {
      setError("No se pudo conectar con el servidor");
    } finally {
      setLoading(false);
    }
  }, [clienteId]);

  useEffect(() => {
    cargarEstado();
  }, [cargarEstado]);

  const clienteNombre = useMemo(() => {
    if (!estado?.cliente) return "";
    return `${estado.cliente.nombres} ${estado.cliente.apellidos}`;
  }, [estado]);

  const movimientos = useMemo(() => {
    if (!estado?.ventas) return [];
    return estado.ventas
      .flatMap((venta) =>
        venta.pagos.map((pago) => ({
          ...pago,
          lote: venta.lote,
        }))
      )
      .sort((a, b) => String(b.fechaPago).localeCompare(String(a.fechaPago)));
  }, [estado]);

  const descargarJpg = async () => {
    if (!estado) return;
    setDescargando(true);
    try {
      await descargarEstadoJpg(estado, clienteNombre, movimientos);
    } finally {
      setDescargando(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <div className="no-print sticky top-0 z-20 bg-[var(--bg)]/95 backdrop-blur border-b border-[var(--card-border)]">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between gap-2">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg font-semibold"
            style={{ backgroundColor: "var(--card)", border: "1px solid var(--card-border)" }}
          >
            <ArrowLeft size={16} />
            Volver
          </button>

          <div className="flex gap-2">
            <button
              onClick={cargarEstado}
              className="w-10 h-10 grid place-items-center rounded-lg"
              style={{ backgroundColor: "var(--card)", border: "1px solid var(--card-border)" }}
              aria-label="Actualizar"
            >
              <RefreshCw size={16} />
            </button>
            <button
              onClick={descargarJpg}
              disabled={!estado || descargando}
              className="w-10 h-10 grid place-items-center rounded-lg text-white disabled:opacity-50"
              style={{ backgroundColor: "#16a34a" }}
              aria-label="Descargar JPG"
            >
              <Download size={17} />
            </button>
            <button
              onClick={() => window.print()}
              className="w-10 h-10 grid place-items-center rounded-lg text-white"
              style={{ backgroundColor: "var(--primary)" }}
              aria-label="Imprimir"
            >
              <Printer size={17} />
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-md mx-auto px-4 py-5 print-page">
        {loading && <p className="opacity-60">Cargando estado de cuenta...</p>}
        {error && <p className="text-red-500">{error}</p>}

        {!loading && estado && (
          <div className="statement bg-white text-slate-900 rounded-[28px] shadow-xl overflow-hidden">
            <header className="px-5 py-5 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <img
                  src="/logo.jpeg"
                  alt="Villas del Rosario"
                  className="w-16 h-16 rounded-2xl object-cover border border-amber-200"
                />
                <div className="min-w-0 flex-1">
                  <h1 className="text-lg font-bold leading-tight">Villas del Rosario</h1>
                  <p className="text-xs text-slate-500">Estado de cuenta</p>
                  <p className="text-xs text-slate-400">Generado: {fecha(estado.generadoEn)}</p>
                </div>
              </div>
            </header>

            <section className="px-5 py-4 border-b border-slate-200">
              <h2 className="text-xl font-bold leading-tight">{clienteNombre}</h2>
              <p className="text-sm text-slate-600 mt-1">Tel. {estado.cliente.telefono || "N/A"}</p>
              <p className="text-sm text-slate-600">{estado.cliente.direccion || "Sin direccion"}</p>
              {estado.cliente.zona && <p className="text-sm text-slate-600">{estado.cliente.zona}</p>}
            </section>

            <section className="grid grid-cols-2 gap-2 px-5 py-4 border-b border-slate-200">
              <div className="rounded-2xl bg-blue-50 p-3">
                <p className="text-[11px] uppercase font-semibold text-blue-700">Vendido</p>
                <p className="text-base font-bold">Q{moneda(estado.resumen.totalVendido)}</p>
              </div>
              <div className="rounded-2xl bg-emerald-50 p-3">
                <p className="text-[11px] uppercase font-semibold text-emerald-700">Pagado</p>
                <p className="text-base font-bold text-emerald-700">Q{moneda(estado.resumen.totalPagado)}</p>
              </div>
              <div className="rounded-2xl bg-amber-50 p-3">
                <p className="text-[11px] uppercase font-semibold text-amber-700">Pendiente</p>
                <p className="text-base font-bold text-amber-700">Q{moneda(estado.resumen.saldoPendiente)}</p>
              </div>
              <div className="rounded-2xl bg-red-50 p-3">
                <p className="text-[11px] uppercase font-semibold text-red-700">Mora</p>
                <p className="text-base font-bold text-red-700">{estado.resumen.cuotasEnMora} cuotas</p>
              </div>
            </section>

            <section className="px-5 py-4 border-b border-slate-200">
              <h3 className="font-bold mb-3">Ventas</h3>
              <div className="space-y-2">
                {estado.ventas.length === 0 && (
                  <p className="text-sm text-slate-500">Sin ventas registradas.</p>
                )}
                {estado.ventas.slice(0, 4).map((venta) => (
                  <div key={venta.id} className="rounded-2xl bg-slate-50 px-3 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-bold">Lote {venta.lote}</p>
                        <p className="text-xs text-slate-500">
                          {venta.cuotasPagadas}/{venta.totalCuotas} cuotas · {venta.estado}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-500">Saldo</p>
                        <p className="font-bold text-amber-700">Q{moneda(venta.saldoPendiente)}</p>
                      </div>
                    </div>
                  </div>
                ))}
                {estado.ventas.length > 4 && (
                  <p className="text-xs text-slate-500">+ {estado.ventas.length - 4} venta(s) adicional(es).</p>
                )}
              </div>
            </section>

            <section className="px-5 py-4">
              <h3 className="font-bold mb-3">Ultimos movimientos</h3>
              <div className="divide-y divide-slate-100">
                {movimientos.length === 0 && (
                  <p className="text-sm text-slate-500">Sin pagos registrados.</p>
                )}
                {movimientos.slice(0, 7).map((pago) => (
                  <div key={pago.id} className="py-2 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{etiquetaPago(pago)}</p>
                      <p className="text-xs text-slate-500">
                        {fecha(pago.fechaPago)} · Lote {pago.lote}
                      </p>
                    </div>
                    <p className="font-bold text-emerald-700">Q{moneda(pago.montoPagado)}</p>
                  </div>
                ))}
              </div>
            </section>

            <footer className="bg-slate-900 text-white text-center text-xs px-5 py-3">
              Documento informativo generado por Villas del Rosario
            </footer>
          </div>
        )}
      </main>

      <style>{`
        @media print {
          body { background: #fff !important; }
          .no-print { display: none !important; }
          .print-page { max-width: none !important; padding: 0 !important; }
          .statement { box-shadow: none !important; border-radius: 0 !important; }
        }
      `}</style>
    </div>
  );
}
