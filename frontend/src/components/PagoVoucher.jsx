import { Download, X } from "lucide-react";

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

const tituloTipo = {
  cuota: "Pago de cuota",
  abono: "Abono",
  enganche: "Enganche",
  pago_parcial: "Pago parcial",
};

const pendienteCuotaLabel = (voucher) =>
  voucher.numeroCuota ? `Q${moneda(voucher.venta.pendienteCuotaActual)}` : "N/A";

const cargarImagen = (src) =>
  new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });

const texto = (ctx, value, x, y, opts = {}) => {
  const { size = 28, weight = "400", color = "#0f172a", align = "left" } = opts;
  ctx.font = `${weight} ${size}px Arial`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.fillText(value, x, y);
};

const roundedRect = (ctx, x, y, w, h, r) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
};

async function descargarJpg(voucher) {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1480;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#f1f5f9";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#ffffff";
  roundedRect(ctx, 64, 64, 952, 1352, 34);
  ctx.fill();

  const logo = await cargarImagen("/logo.jpeg");
  if (logo) {
    ctx.save();
    roundedRect(ctx, 96, 96, 112, 112, 26);
    ctx.clip();
    ctx.drawImage(logo, 96, 96, 112, 112);
    ctx.restore();
  }

  texto(ctx, "Villas del Rosario", 232, 136, { size: 38, weight: "700" });
  texto(ctx, "Voucher de pago", 232, 178, { size: 25, color: "#64748b" });
  texto(ctx, fecha(voucher.generadoEn), 984, 136, { size: 22, color: "#64748b", align: "right" });

  ctx.strokeStyle = "#e2e8f0";
  ctx.beginPath();
  ctx.moveTo(96, 248);
  ctx.lineTo(984, 248);
  ctx.stroke();

  const nombre = `${voucher.cliente.nombres} ${voucher.cliente.apellidos}`;
  texto(ctx, nombre, 96, 316, { size: 39, weight: "700" });
  texto(ctx, `Tel. ${voucher.cliente.telefono || "N/A"}`, 96, 356, { size: 24, color: "#475569" });
  texto(ctx, `Lote ${voucher.venta.lote}`, 96, 396, { size: 27, weight: "700", color: "#1d4ed8" });

  ctx.fillStyle = "#ecfdf5";
  roundedRect(ctx, 96, 452, 888, 180, 28);
  ctx.fill();
  texto(ctx, tituloTipo[voucher.tipo] || "Pago", 136, 510, { size: 28, color: "#047857", weight: "700" });
  texto(ctx, `Q${moneda(voucher.montoPagado)}`, 136, 588, { size: 58, color: "#047857", weight: "700" });
  texto(ctx, `Fecha de pago: ${fecha(voucher.fechaPago)}`, 984, 510, {
    size: 24,
    color: "#047857",
    align: "right",
  });

  const rows = [
    ["Cuota", voucher.numeroCuota ? `#${voucher.numeroCuota}/${voucher.venta.cuotas}` : "N/A"],
    ["Cuota mensual", `Q${moneda(voucher.venta.cuotaMonto)}`],
    ["Pendiente esta cuota", pendienteCuotaLabel(voucher)],
    ["Saldo restante", `Q${moneda(voucher.venta.saldoRestante)}`],
    ["Avance", `${voucher.venta.cuotasPagadas}/${voucher.venta.cuotas} cuotas`],
    ["Estado venta", voucher.venta.estado],
  ];

  let y = 710;
  rows.forEach(([label, value]) => {
    ctx.strokeStyle = "#e2e8f0";
    ctx.beginPath();
    ctx.moveTo(96, y - 34);
    ctx.lineTo(984, y - 34);
    ctx.stroke();
    texto(ctx, label, 96, y, { size: 27, color: "#64748b" });
    texto(ctx, value, 984, y, { size: 29, weight: "700", align: "right" });
    y += 78;
  });

  if (voucher.nota) {
    ctx.fillStyle = "#fffbeb";
    roundedRect(ctx, 96, y - 20, 888, 112, 22);
    ctx.fill();
    texto(ctx, "Nota", 128, y + 24, { size: 24, weight: "700", color: "#92400e" });
    texto(ctx, String(voucher.nota).slice(0, 58), 128, y + 64, { size: 23, color: "#92400e" });
    y += 130;
  }

  if (voucher.fechaProgramada) {
    texto(ctx, `Proximo cobro: ${fecha(voucher.fechaProgramada)}`, 96, y + 20, {
      size: 25,
      weight: "700",
      color: "#b45309",
    });
  }

  ctx.fillStyle = "#0f172a";
  roundedRect(ctx, 96, 1288, 888, 70, 20);
  ctx.fill();
  texto(ctx, "Gracias por su pago", 540, 1332, {
    size: 28,
    weight: "700",
    color: "#ffffff",
    align: "center",
  });

  const cliente = `${voucher.cliente.nombres}_${voucher.cliente.apellidos}`.replace(/\s+/g, "_");
  const link = document.createElement("a");
  link.download = `voucher_${cliente}_${Date.now()}.jpg`;
  link.href = canvas.toDataURL("image/jpeg", 0.92);
  link.click();
}

export default function PagoVoucher({ voucher, onClose }) {
  if (!voucher) return null;

  const nombre = `${voucher.cliente.nombres} ${voucher.cliente.apellidos}`;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl bg-white text-slate-900 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div>
            <p className="text-xs opacity-70">Villas del Rosario</p>
            <h2 className="font-bold">Voucher de pago</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 grid place-items-center rounded-full bg-white/10">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <p className="text-xs text-slate-500">Cliente</p>
            <p className="text-lg font-bold">{nombre}</p>
            <p className="text-sm text-slate-500">Lote {voucher.venta.lote}</p>
          </div>

          <div className="rounded-2xl bg-emerald-50 p-4">
            <p className="text-sm font-semibold text-emerald-700">
              {tituloTipo[voucher.tipo] || "Pago"}
            </p>
            <p className="text-3xl font-bold text-emerald-700">Q{moneda(voucher.montoPagado)}</p>
            <p className="text-xs text-emerald-700 mt-1">{fecha(voucher.fechaPago)}</p>
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Cuota</p>
              <p className="font-bold">
                {voucher.numeroCuota ? `#${voucher.numeroCuota}/${voucher.venta.cuotas}` : "N/A"}
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Saldo restante</p>
              <p className="font-bold">Q{moneda(voucher.venta.saldoRestante)}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Pendiente esta cuota</p>
              <p className="font-bold">{pendienteCuotaLabel(voucher)}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Avance</p>
              <p className="font-bold">{voucher.venta.cuotasPagadas}/{voucher.venta.cuotas}</p>
            </div>
          </div>

          {voucher.nota && (
            <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
              <p className="font-semibold">Nota</p>
              <p>{voucher.nota}</p>
            </div>
          )}

          {voucher.fechaProgramada && (
            <p className="text-sm font-semibold text-amber-700">
              Proximo cobro: {fecha(voucher.fechaProgramada)}
            </p>
          )}

          <button
            onClick={() => descargarJpg(voucher)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-semibold bg-emerald-600"
          >
            <Download size={17} />
            Descargar JPG
          </button>
        </div>
      </div>
    </div>
  );
}
