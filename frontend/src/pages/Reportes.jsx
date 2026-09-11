import { useState } from "react";
import {
  FileBarChart2,
  CreditCard,
  ClipboardList,
  Wallet,
  Search,
  FileSpreadsheet,
  FileText,
} from "lucide-react";
import { API_URL, authFetch } from "../services/api";

const API = `${API_URL}/api/reportes`;
const ESTADOS = ["activo", "pagado", "vencido"];

const formatearFecha = (fecha) => {
  if (!fecha) return "";
  const str = typeof fecha === "string" ? fecha : String(fecha);
  const limpia = str.split("T")[0];
  const [year, month, day] = limpia.split("-");
  return `${day}-${month}-${year}`;
};

const formatearMoneda = (monto) =>
  Number(monto || 0).toLocaleString("es-GT", { minimumFractionDigits: 2 });

const lotesVenta = (venta) => {
  if (venta.predios?.length) {
    return venta.predios.map((predio) => predio.numeroLote).filter(Boolean).join(", ");
  }

  return venta.numeroLote || "N/A";
};

const etiquetaPago = (pago) => {
  if (pago.tipoPago === "abono") return "Abono";
  if (pago.tipoPago === "enganche") return "Enganche";
  return "Pago de cuota";
};

const TABS = [
  { key: "pagos", label: "Pagos", icon: CreditCard },
  { key: "ventas", label: "Ventas", icon: ClipboardList },
  { key: "cartera", label: "Cartera", icon: Wallet },
];

export default function Reportes() {
  const [tab, setTab] = useState("pagos");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [estado, setEstado] = useState("");
  const [datos, setDatos] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const resetFiltros = (nextTab) => {
    setTab(nextTab);
    setDatos(null);
    setError("");
    setFechaInicio("");
    setFechaFin("");
    setEstado("");
  };

  const fetchReporte = async () => {
    setError("");
    setDatos(null);
    setLoading(true);

    try {
      let url = "";

      if (tab === "pagos") {
        if (!fechaInicio || !fechaFin) {
          setError("Selecciona un rango de fechas para el reporte de pagos");
          setLoading(false);
          return;
        }
        url = `${API}/pagos?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`;
      }

      if (tab === "ventas") {
        const params = new URLSearchParams();
        if (estado) params.append("estado", estado);
        if (fechaInicio) params.append("fechaInicio", fechaInicio);
        if (fechaFin) params.append("fechaFin", fechaFin);
        url = `${API}/ventas${params.toString() ? `?${params}` : ""}`;
      }

      if (tab === "cartera") {
        const params = new URLSearchParams();
        if (estado) params.append("estado", estado);
        if (fechaInicio) params.append("fechaInicio", fechaInicio);
        if (fechaFin) params.append("fechaFin", fechaFin);
        url = `${API}/cartera${params.toString() ? `?${params}` : ""}`;
      }

      const res = await authFetch(url);
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Error al obtener reporte");
        return;
      }

      setDatos(data);
    } catch (err) {
      console.error(err);
      setError("No se pudo conectar con el servidor");
    } finally {
      setLoading(false);
    }
  };

  const exportar = async (formato) => {
    try {
      let url = `${API}/exportar/${formato}?tipo=${tab}`;
      if (fechaInicio) url += `&fechaInicio=${fechaInicio}`;
      if (fechaFin) url += `&fechaFin=${fechaFin}`;
      if (estado) url += `&estado=${estado}`;

      const res = await authFetch(url);
      if (!res.ok) {
        alert("Error al exportar");
        return;
      }

      const blob = await res.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `reporte_${tab}.${formato === "excel" ? "xlsx" : "pdf"}`;
      link.click();
    } catch (err) {
      console.error(err);
      alert("Error al exportar");
    }
  };

  const mostrarFechas = tab === "pagos" || tab === "ventas" || tab === "cartera";
  const mostrarEstado = tab === "ventas" || tab === "cartera";

  return (
    <div className="min-w-0 text-[var(--text)]">
      <h1 className="mb-4 flex items-center gap-2 text-xl font-bold sm:mb-6 sm:text-2xl">
        <FileBarChart2 size={24} style={{ color: "var(--primary)" }} />
        Reportes
      </h1>

      <div className="mb-4 grid grid-cols-3 gap-2 sm:mb-6 sm:flex">
        {TABS.map(({ key, label, icon }) => {
          const TabIcon = icon;
          return (
            <button
              key={key}
              onClick={() => resetFiltros(key)}
              className="flex min-w-0 items-center justify-center gap-1 rounded-lg px-2 py-2 text-sm font-semibold transition hover:opacity-90 sm:gap-2 sm:px-4 sm:text-base"
              style={{
                backgroundColor: tab === key ? "var(--primary)" : "var(--card)",
                color: tab === key ? "white" : "var(--text)",
                border: "1px solid var(--card-border)",
              }}
            >
              <TabIcon size={15} />
              {label}
            </button>
          );
        })}
      </div>

      <div
        className="mb-4 min-w-0 rounded-xl p-3 sm:mb-6 sm:p-5"
        style={{ backgroundColor: "var(--card)", border: "1px solid var(--card-border)" }}
      >
        <p className="text-sm font-semibold mb-3 opacity-60">Filtros</p>
        <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {mostrarFechas && (
            <>
              <div className="flex min-w-0 flex-col gap-1">
                <label className="text-xs opacity-60">
                  Fecha inicio {tab !== "pagos" && <span className="opacity-50">(opcional)</span>}
                </label>
                <input
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  className="w-full min-w-0 rounded-lg px-3 py-2"
                  style={{
                    backgroundColor: "var(--bg)",
                    color: "var(--text)",
                    border: "1px solid var(--card-border)",
                  }}
                />
              </div>

              <div className="flex min-w-0 flex-col gap-1">
                <label className="text-xs opacity-60">
                  Fecha fin {tab !== "pagos" && <span className="opacity-50">(opcional)</span>}
                </label>
                <input
                  type="date"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                  className="w-full min-w-0 rounded-lg px-3 py-2"
                  style={{
                    backgroundColor: "var(--bg)",
                    color: "var(--text)",
                    border: "1px solid var(--card-border)",
                  }}
                />
              </div>
            </>
          )}

          {mostrarEstado && (
            <div className="flex min-w-0 flex-col gap-1">
              <label className="text-xs opacity-60">Estado</label>
              <select
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
                className="w-full min-w-0 rounded-lg px-3 py-2"
                style={{
                  backgroundColor: "var(--bg)",
                  color: "var(--text)",
                  border: "1px solid var(--card-border)",
                }}
              >
                <option value="">Todos</option>
                {ESTADOS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex min-w-0 items-end">
            <button
              onClick={fetchReporte}
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg px-5 py-2 font-semibold text-white hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: "var(--secondary)" }}
            >
              <Search size={15} />
              {loading ? "Cargando..." : "Generar"}
            </button>
          </div>
        </div>

        {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
      </div>

      {datos && (
        <>
          <div className="mb-4 flex flex-col gap-2 sm:flex-row">
            <button
              onClick={() => exportar("excel")}
              className="flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white hover:opacity-90 sm:w-auto"
              style={{ backgroundColor: "#16a34a" }}
            >
              <FileSpreadsheet size={15} />
              Exportar Excel
            </button>

            <button
              onClick={() => exportar("pdf")}
              className="flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white hover:opacity-90 sm:w-auto"
              style={{ backgroundColor: "#dc2626" }}
            >
              <FileText size={15} />
              Exportar PDF
            </button>
          </div>

          {tab === "pagos" && Array.isArray(datos) && (
            <div className="min-w-0 overflow-hidden rounded-xl" style={{ border: "1px solid var(--card-border)" }}>
              <div className="p-3 sm:p-4" style={{ backgroundColor: "var(--card)" }}>
                <p className="font-semibold">Total de pagos registrados: {datos.length}</p>
                <p className="text-sm opacity-60">
                  Total cobrado: Q
                  {formatearMoneda(datos.reduce((suma, pago) => suma + Number(pago.montoPagado), 0))}
                </p>
              </div>

              <div className="max-w-full overflow-x-auto overscroll-x-contain">
                <table className="w-full min-w-[720px] text-sm" style={{ backgroundColor: "var(--card)" }}>
                  <thead>
                    <tr style={{ backgroundColor: "var(--secondary)", color: "white" }}>
                      <th className="p-3 text-left">Fecha</th>
                      <th className="p-3 text-left">Cliente</th>
                      <th className="p-3 text-left">Lote</th>
                      <th className="p-3 text-left">Cuota</th>
                      <th className="p-3 text-left">Monto</th>
                      <th className="p-3 text-left">Registrado por</th>
                    </tr>
                  </thead>
                  <tbody>
                    {datos.map((pago) => (
                      <tr key={pago.id} className="border-t" style={{ borderColor: "var(--card-border)" }}>
                        <td className="p-3">{formatearFecha(pago.fechaPago)}</td>
                        <td className="p-3">
                          {pago.prestamo?.cliente?.nombres} {pago.prestamo?.cliente?.apellidos}
                        </td>
                        <td className="p-3">{pago.prestamo?.numeroLote || "N/A"}</td>
                        <td className="p-3">
                          {etiquetaPago(pago)}
                        </td>
                        <td className="p-3 font-semibold" style={{ color: "var(--primary)" }}>
                          Q{formatearMoneda(pago.montoPagado)}
                        </td>
                        <td className="p-3 opacity-60">{pago.usuario?.username || "N/A"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === "ventas" && Array.isArray(datos) && (
            <div className="min-w-0 overflow-hidden rounded-xl" style={{ border: "1px solid var(--card-border)" }}>
              <div className="p-3 sm:p-4" style={{ backgroundColor: "var(--card)" }}>
                <p className="font-semibold">Total de ventas: {datos.length}</p>
                <p className="text-sm opacity-60">
                  Valor total de lotes:{" "}
                  {datos.every((venta) => venta.resumenFinanciero)
                    ? `Q${formatearMoneda(
                        datos.reduce(
                          (suma, venta) => suma + Number(venta.resumenFinanciero.montoTotal),
                          0
                        )
                      )}`
                    : "—"}
                </p>
                {(fechaInicio || fechaFin) && (
                  <p className="text-xs opacity-50 mt-1">
                    Filtrando por fecha de inicio: {fechaInicio ? formatearFecha(fechaInicio) : "—"} a{" "}
                    {fechaFin ? formatearFecha(fechaFin) : "—"}
                  </p>
                )}
              </div>

              <div className="max-w-full overflow-x-auto overscroll-x-contain">
                <table className="w-full min-w-[900px] text-sm" style={{ backgroundColor: "var(--card)" }}>
                  <thead>
                    <tr style={{ backgroundColor: "var(--secondary)", color: "white" }}>
                      <th className="p-3 text-left">Cliente</th>
                      <th className="p-3 text-left">Lote</th>
                      <th className="p-3 text-left">Precio</th>
                      <th className="p-3 text-left">Cuotas</th>
                      <th className="p-3 text-left">Avance</th>
                      <th className="p-3 text-left">Saldo pendiente</th>
                      <th className="p-3 text-left">Cobro pactado</th>
                      <th className="p-3 text-left">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {datos.map((venta) => {
                      const resumen = venta.resumenFinanciero;

                      return (
                        <tr key={venta.id} className="border-t" style={{ borderColor: "var(--card-border)" }}>
                          <td className="p-3">
                            {venta.cliente?.nombres} {venta.cliente?.apellidos}
                          </td>
                          <td className="p-3">{lotesVenta(venta)}</td>
                          <td className="p-3 font-semibold" style={{ color: "var(--primary)" }}>
                            {resumen ? `Q${formatearMoneda(resumen.montoTotal)}` : "—"}
                          </td>
                          <td className="p-3">{resumen?.fraccion || "—"}</td>
                          <td className="p-3">
                            {resumen ? `${resumen.porcentaje}%` : "—"}
                          </td>
                          <td className="p-3">
                            {resumen ? `Q${formatearMoneda(resumen.saldoPendiente)}` : "—"}
                          </td>
                          <td className="p-3">{formatearFecha(venta.fechaCobro) || "N/A"}</td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                resumen?.estado === "activo"
                                  ? "bg-green-100 text-green-700"
                                  : resumen?.estado === "pagado"
                                    ? "bg-blue-100 text-blue-700"
                                    : "bg-red-100 text-red-700"
                              }`}
                            >
                              {resumen?.estado || "—"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === "cartera" && datos.detalle && (
            <>
              <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:mb-6 xl:grid-cols-4">
                <div
                  className="min-w-0 rounded-xl p-4 text-center sm:p-5"
                  style={{ backgroundColor: "var(--card)", border: "1px solid var(--card-border)" }}
                >
                  <p className="text-sm opacity-60 mb-1">Ventas activas en reporte</p>
                  <p className="break-words text-xl font-bold sm:text-2xl" style={{ color: "var(--primary)" }}>
                    {datos.totalVentas}
                  </p>
                </div>

                <div
                  className="min-w-0 rounded-xl p-4 text-center sm:p-5"
                  style={{ backgroundColor: "var(--card)", border: "1px solid var(--card-border)" }}
                >
                  <p className="text-sm opacity-60 mb-1">Valor total de lotes</p>
                  <p className="break-words text-xl font-bold sm:text-2xl" style={{ color: "var(--secondary)" }}>
                    Q{formatearMoneda(datos.totalValorLotes)}
                  </p>
                </div>

                <div
                  className="min-w-0 rounded-xl p-4 text-center sm:p-5"
                  style={{ backgroundColor: "var(--card)", border: "1px solid var(--card-border)" }}
                >
                  <p className="text-sm opacity-60 mb-1">Cobrado histórico</p>
                  <p className="break-words text-xl font-bold text-green-500 sm:text-2xl">
                    Q{formatearMoneda(datos.totalCobradoHistorico)}
                  </p>
                </div>

                <div
                  className="min-w-0 rounded-xl p-4 text-center sm:p-5"
                  style={{ backgroundColor: "var(--card)", border: "1px solid var(--card-border)" }}
                >
                  <p className="text-sm opacity-60 mb-1">Saldo pendiente</p>
                  <p className="break-words text-xl font-bold text-amber-500 sm:text-2xl">
                    Q{formatearMoneda(datos.totalSaldoPendiente)}
                  </p>
                </div>
              </div>

              <div className="rounded-xl p-4 mb-4" style={{ backgroundColor: "var(--card)", border: "1px solid var(--card-border)" }}>
                <p className="font-semibold">Avance general de cuotas</p>
                <p className="text-sm opacity-60 mt-1">
                  {datos.totalCuotasPagadas}/{datos.totalCuotas} cuotas registradas ({datos.porcentajeGeneral}%)
                </p>
              </div>

              <div className="min-w-0 overflow-hidden rounded-xl" style={{ border: "1px solid var(--card-border)" }}>
                <div className="max-w-full overflow-x-auto overscroll-x-contain">
                  <table className="w-full min-w-[800px] text-sm" style={{ backgroundColor: "var(--card)" }}>
                    <thead>
                      <tr style={{ backgroundColor: "var(--secondary)", color: "white" }}>
                        <th className="p-3 text-left">Cliente</th>
                        <th className="p-3 text-left">Lote</th>
                        <th className="p-3 text-left">Avance</th>
                        <th className="p-3 text-left">Cobrado</th>
                        <th className="p-3 text-left">Saldo pendiente</th>
                        <th className="p-3 text-left">Último pago</th>
                        <th className="p-3 text-left">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {datos.detalle.map((item, index) => {
                        const resumen = item.resumenFinanciero;

                        return (
                          <tr key={`${item.lote}-${index}`} className="border-t" style={{ borderColor: "var(--card-border)" }}>
                            <td className="p-3">{item.cliente}</td>
                            <td className="p-3">{item.lote}</td>
                            <td className="p-3">
                              {resumen ? `${resumen.fraccion} (${resumen.porcentaje}%)` : "—"}
                            </td>
                            <td className="p-3">
                              {resumen && item.totalCobradoHistorico != null
                                ? `Q${formatearMoneda(item.totalCobradoHistorico)}`
                                : "—"}
                            </td>
                            <td className="p-3 font-semibold text-amber-500">
                              {resumen ? `Q${formatearMoneda(resumen.saldoPendiente)}` : "—"}
                            </td>
                            <td className="p-3">{formatearFecha(item.ultimoPago) || "N/A"}</td>
                            <td className="p-3">
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                  resumen?.estado === "activo"
                                    ? "bg-green-100 text-green-700"
                                    : resumen?.estado === "pagado"
                                      ? "bg-blue-100 text-blue-700"
                                      : "bg-red-100 text-red-700"
                                }`}
                              >
                                {resumen?.estado || "—"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
