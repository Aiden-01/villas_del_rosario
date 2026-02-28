import { useState } from "react";

const API = "http://localhost:3333/api/reportes";

const ESTADOS = ["activo", "pagado", "vencido"];

export default function Reportes() {
  const [tab, setTab] = useState("pagos");

  // Filtros
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [estado, setEstado] = useState("");

  // Data
  const [datos, setDatos] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const token = localStorage.getItem("token");

  const fetchReporte = async () => {
    setError("");
    setDatos(null);
    setLoading(true);

    try {
      let url = "";

      if (tab === "pagos") {
        if (!fechaInicio || !fechaFin) {
          setError("Selecciona un rango de fechas");
          setLoading(false);
          return;
        }
        url = `${API}/pagos?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`;
      } else if (tab === "prestamos") {
        url = `${API}/prestamos${estado ? `?estado=${estado}` : ""}`;
      } else if (tab === "ganancias") {
        if (!fechaInicio || !fechaFin) {
          setError("Selecciona un rango de fechas");
          setLoading(false);
          return;
        }
        url = `${API}/ganancias?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`;
      }

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

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

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

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

  const formatearFecha = (fecha) => {
    if (!fecha) return "";
    const [year, month, day] = fecha.split("T")[0].split("-");
    return `${day}-${month}-${year}`;
  };

  return (
    <div className="pt-16 text-[var(--text)]">
      <h1 className="text-2xl font-bold mb-6">Reportes</h1>

      {/* TABS */}
      <div className="flex gap-2 mb-6">
        {["pagos", "prestamos", "ganancias"].map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setDatos(null); setError(""); }}
            className="px-4 py-2 rounded-lg font-semibold capitalize transition hover:opacity-90"
            style={{
              backgroundColor: tab === t ? "var(--primary)" : "var(--card)",
              color: tab === t ? "white" : "var(--text)",
              border: "1px solid var(--card-border)",
            }}
          >
            {t === "pagos" ? "💳 Pagos" : t === "prestamos" ? "📋 Préstamos" : "💰 Ganancias"}
          </button>
        ))}
      </div>

      {/* FILTROS */}
      <div
        className="rounded-xl p-5 mb-6"
        style={{ backgroundColor: "var(--card)", border: "1px solid var(--card-border)" }}
      >
        <p className="text-sm font-semibold mb-3 opacity-60">Filtros</p>
        <div className="flex flex-wrap gap-3">
          {(tab === "pagos" || tab === "ganancias") && (
            <>
              <div className="flex flex-col gap-1">
                <label className="text-xs opacity-60">Fecha inicio</label>
                <input
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  className="px-3 py-2 rounded-lg"
                  style={{ backgroundColor: "var(--bg)", color: "var(--text)", border: "1px solid var(--card-border)" }}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs opacity-60">Fecha fin</label>
                <input
                  type="date"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                  className="px-3 py-2 rounded-lg"
                  style={{ backgroundColor: "var(--bg)", color: "var(--text)", border: "1px solid var(--card-border)" }}
                />
              </div>
            </>
          )}

          {tab === "prestamos" && (
            <div className="flex flex-col gap-1">
              <label className="text-xs opacity-60">Estado</label>
              <select
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
                className="px-3 py-2 rounded-lg"
                style={{ backgroundColor: "var(--bg)", color: "var(--text)", border: "1px solid var(--card-border)" }}
              >
                <option value="">Todos</option>
                {ESTADOS.map((e) => (
                  <option key={e} value={e}>{e}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-end">
            <button
              onClick={fetchReporte}
              disabled={loading}
              className="px-5 py-2 text-white rounded-lg font-semibold hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: "var(--secondary)" }}
            >
              {loading ? "Cargando..." : "🔍 Generar"}
            </button>
          </div>
        </div>

        {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
      </div>

      {/* RESULTADOS */}
      {datos && (
        <>
          {/* BOTONES EXPORTAR */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => exportar("excel")}
              className="px-4 py-2 text-white rounded-lg font-semibold hover:opacity-90 text-sm"
              style={{ backgroundColor: "#16a34a" }}
            >
              📊 Exportar Excel
            </button>
            <button
              onClick={() => exportar("pdf")}
              className="px-4 py-2 text-white rounded-lg font-semibold hover:opacity-90 text-sm"
              style={{ backgroundColor: "#dc2626" }}
            >
              📄 Exportar PDF
            </button>
          </div>

          {/* TABLA PAGOS */}
          {tab === "pagos" && Array.isArray(datos) && (
            <div
              className="rounded-xl overflow-hidden"
              style={{ border: "1px solid var(--card-border)" }}
            >
              <div className="p-4" style={{ backgroundColor: "var(--card)" }}>
                <p className="font-semibold">Total de pagos: {datos.length}</p>
                <p className="text-sm opacity-60">
                  Total cobrado: Q{datos.reduce((s, p) => s + Number(p.montoPagado), 0).toLocaleString("es-GT", { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm" style={{ backgroundColor: "var(--card)" }}>
                  <thead>
                    <tr style={{ backgroundColor: "var(--secondary)", color: "white" }}>
                      <th className="p-3 text-left">Fecha</th>
                      <th className="p-3 text-left">Cliente</th>
                      <th className="p-3 text-left">Cuota #</th>
                      <th className="p-3 text-left">Monto</th>
                      <th className="p-3 text-left">Cobrado por</th>
                    </tr>
                  </thead>
                  <tbody>
                    {datos.map((p) => (
                      <tr
                        key={p.id}
                        className="border-t"
                        style={{ borderColor: "var(--card-border)" }}
                      >
                        <td className="p-3">{formatearFecha(p.fechaPago)}</td>
                        <td className="p-3">{p.prestamo?.cliente?.nombres} {p.prestamo?.cliente?.apellidos}</td>
                        <td className="p-3">#{p.numeroCuota}</td>
                        <td className="p-3 font-semibold" style={{ color: "var(--primary)" }}>
                          Q{Number(p.montoPagado).toLocaleString("es-GT", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-3 opacity-60">{p.usuario?.username || "N/A"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TABLA PRÉSTAMOS */}
          {tab === "prestamos" && Array.isArray(datos) && (
            <div
              className="rounded-xl overflow-hidden"
              style={{ border: "1px solid var(--card-border)" }}
            >
              <div className="p-4" style={{ backgroundColor: "var(--card)" }}>
                <p className="font-semibold">Total de préstamos: {datos.length}</p>
                <p className="text-sm opacity-60">
                  Total prestado: Q{datos.reduce((s, p) => s + Number(p.monto), 0).toLocaleString("es-GT", { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm" style={{ backgroundColor: "var(--card)" }}>
                  <thead>
                    <tr style={{ backgroundColor: "var(--secondary)", color: "white" }}>
                      <th className="p-3 text-left">Cliente</th>
                      <th className="p-3 text-left">Monto</th>
                      <th className="p-3 text-left">Interés</th>
                      <th className="p-3 text-left">Cuotas</th>
                      <th className="p-3 text-left">Inicio</th>
                      <th className="p-3 text-left">Fin</th>
                      <th className="p-3 text-left">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {datos.map((p) => (
                      <tr
                        key={p.id}
                        className="border-t"
                        style={{ borderColor: "var(--card-border)" }}
                      >
                        <td className="p-3">{p.cliente?.nombres} {p.cliente?.apellidos}</td>
                        <td className="p-3 font-semibold" style={{ color: "var(--primary)" }}>
                          Q{Number(p.monto).toLocaleString("es-GT", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-3">{p.interes}%</td>
                        <td className="p-3">{p.cuotas} sem</td>
                        <td className="p-3">{formatearFecha(p.fechaInicio)}</td>
                        <td className="p-3">{formatearFecha(p.fechaFin)}</td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            p.estado === "activo" ? "bg-green-100 text-green-700" :
                            p.estado === "pagado" ? "bg-blue-100 text-blue-700" :
                            "bg-red-100 text-red-700"
                          }`}>
                            {p.estado}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* RESUMEN GANANCIAS */}
          {tab === "ganancias" && datos.detalle && (
            <>
              {/* TARJETAS RESUMEN */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div
                  className="rounded-xl p-5 text-center"
                  style={{ backgroundColor: "var(--card)", border: "1px solid var(--card-border)" }}
                >
                  <p className="text-sm opacity-60 mb-1">Total Cobrado</p>
                  <p className="text-2xl font-bold" style={{ color: "var(--primary)" }}>
                    Q{datos.totalCobrado.toLocaleString("es-GT", { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div
                  className="rounded-xl p-5 text-center"
                  style={{ backgroundColor: "var(--card)", border: "1px solid var(--card-border)" }}
                >
                  <p className="text-sm opacity-60 mb-1">Capital Recuperado</p>
                  <p className="text-2xl font-bold" style={{ color: "var(--secondary)" }}>
                    Q{datos.totalCapital.toLocaleString("es-GT", { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div
                  className="rounded-xl p-5 text-center"
                  style={{ backgroundColor: "var(--card)", border: "1px solid var(--card-border)" }}
                >
                  <p className="text-sm opacity-60 mb-1">Ganancia Neta</p>
                  <p className="text-2xl font-bold text-green-500">
                    Q{datos.totalGanancia.toLocaleString("es-GT", { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              {/* TABLA DETALLE */}
              <div
                className="rounded-xl overflow-hidden"
                style={{ border: "1px solid var(--card-border)" }}
              >
                <div className="overflow-x-auto">
                  <table className="w-full text-sm" style={{ backgroundColor: "var(--card)" }}>
                    <thead>
                      <tr style={{ backgroundColor: "var(--secondary)", color: "white" }}>
                        <th className="p-3 text-left">Fecha</th>
                        <th className="p-3 text-left">Cliente</th>
                        <th className="p-3 text-left">Cuota #</th>
                        <th className="p-3 text-left">Cobrado</th>
                        <th className="p-3 text-left">Capital</th>
                        <th className="p-3 text-left">Ganancia</th>
                      </tr>
                    </thead>
                    <tbody>
                      {datos.detalle.map((d, i) => (
                        <tr
                          key={i}
                          className="border-t"
                          style={{ borderColor: "var(--card-border)" }}
                        >
                          <td className="p-3">{formatearFecha(d.fecha)}</td>
                          <td className="p-3">{d.cliente}</td>
                          <td className="p-3">#{d.numeroCuota}</td>
                          <td className="p-3">Q{d.montoPagado.toLocaleString("es-GT", { minimumFractionDigits: 2 })}</td>
                          <td className="p-3">Q{d.capital.toLocaleString("es-GT", { minimumFractionDigits: 2 })}</td>
                          <td className="p-3 font-bold text-green-500">
                            Q{d.ganancia.toLocaleString("es-GT", { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
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