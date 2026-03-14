import { useState, useEffect } from "react";
import useToast from "../hooks/useToast";
import Toast from "../components/Toast";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3333";

export default function RutaDelDia() {
  const [datos, setDatos] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [registrando, setRegistrando] = useState(null);
  const { toast, showToast, closeToast } = useToast();

  const diasSemana = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];
  const hoyNombre = diasSemana[new Date().getDay()];

  const cargarRuta = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/api/rutas/hoy`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Error al cargar ruta");
        return;
      }
      setDatos(data);
    } catch {
      setError("No se pudo conectar con el servidor");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargarRuta(); }, []);

  const registrarPago = async (item) => {
    if (!window.confirm(`¿Registrar pago de Q${Number(item.montoCuota).toFixed(2)} para ${item.cliente.nombres}?`)) return;
    setRegistrando(item.prestamoId);
    try {
      const token = localStorage.getItem("token");
      const hoy = new Date().toISOString().split("T")[0];
      const res = await fetch(`${API_URL}/api/pagos`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          prestamoId: item.prestamoId,
          numeroCuota: item.proximaCuota,
          montoPagado: item.montoCuota,
          fechaPago: hoy,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.message || "Error al registrar pago", "error");
        return;
      }
      showToast(`Cuota #${item.proximaCuota} de ${item.cliente.nombres} registrada`, "success");
      cargarRuta();
    } catch {
      showToast("Error al registrar pago", "error");
    } finally {
      setRegistrando(null);
    }
  };

  return (
    <div className="pt-16 text-[var(--text)]">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">📍 Ruta de Hoy</h1>
          <p className="text-sm opacity-60 mt-1">
            {hoyNombre} — {new Date().toLocaleDateString("es-GT")}
          </p>
        </div>
        <button
          onClick={() => { setLoading(true); setError(""); cargarRuta(); }}
          className="text-white px-4 py-2 rounded-lg shadow hover:opacity-90 transition"
          style={{ backgroundColor: "var(--primary)" }}
        >
          🔄 Actualizar
        </button>
      </div>

      {loading && <p className="opacity-60">Cargando ruta...</p>}
      {error && <p className="text-red-500">{error}</p>}

      {!loading && datos && (
        <>
          {/* RESUMEN */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div
              className="p-4 rounded-xl shadow text-center"
              style={{ backgroundColor: "var(--card)", border: "1px solid var(--card-border)" }}
            >
              <p className="text-3xl font-bold" style={{ color: "var(--primary)" }}>
                {datos.totalPendientes}
              </p>
              <p className="text-sm opacity-60 mt-1">Pendientes</p>
            </div>
            <div
              className="p-4 rounded-xl shadow text-center"
              style={{ backgroundColor: "var(--card)", border: "1px solid var(--card-border)" }}
            >
              <p className="text-3xl font-bold text-green-500">{datos.totalCobrados}</p>
              <p className="text-sm opacity-60 mt-1">Cobrados</p>
            </div>
            <div
              className="p-4 rounded-xl shadow text-center"
              style={{ backgroundColor: "var(--card)", border: "1px solid var(--card-border)" }}
            >
              <p className="text-xl font-bold text-green-500">
                Q{Number(datos.totalRecaudado).toFixed(2)}
              </p>
              <p className="text-sm opacity-60 mt-1">Recaudado</p>
            </div>
          </div>

          {/* PENDIENTES */}
          {datos.pendientes?.length > 0 && (
            <div className="mb-6">
              <h2 className="text-lg font-bold mb-3">⏳ Pendientes</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {datos.pendientes.map((item) => (
                  <div
                    key={item.prestamoId}
                    className="rounded-2xl shadow-md p-5"
                    style={{
                      backgroundColor: "var(--card)",
                      border: "2px solid var(--primary)",
                    }}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-bold text-base">
                          {item.cliente.nombres} {item.cliente.apellidos}
                        </h3>
                        <p className="text-sm opacity-60">📍 {item.cliente.zona || item.cliente.direccion}</p>
                        <p className="text-sm opacity-60">📞 {item.cliente.telefono}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold" style={{ color: "var(--primary)" }}>
                          Q{Number(item.montoCuota).toFixed(2)}
                        </p>
                        <p className="text-xs opacity-60">
                          Cuota {item.proximaCuota}/{item.totalCuotas}
                        </p>
                      </div>
                    </div>

                    <div className="w-full bg-gray-200 rounded-full h-1.5 mb-3">
                      <div
                        className="h-1.5 rounded-full"
                        style={{
                          width: `${Math.round((item.cuotasPagadas / item.totalCuotas) * 100)}%`,
                          backgroundColor: "var(--primary)",
                        }}
                      />
                    </div>

                    <button
                      onClick={() => registrarPago(item)}
                      disabled={registrando === item.prestamoId}
                      className="w-full py-2 rounded-xl font-semibold text-white hover:opacity-90 transition disabled:opacity-50"
                      style={{ backgroundColor: "#16a34a" }}
                    >
                      {registrando === item.prestamoId ? "Registrando..." : `💰 Registrar Cuota #${item.proximaCuota}`}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* COBRADOS */}
          {datos.cobrados?.length > 0 && (
            <div>
              <h2 className="text-lg font-bold mb-3">✅ Cobrados hoy</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {datos.cobrados.map((item) => (
                  <div
                    key={item.prestamoId}
                    className="rounded-2xl shadow-md p-5 opacity-60"
                    style={{
                      backgroundColor: "var(--card)",
                      border: "2px solid #16a34a",
                    }}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-bold">✅ {item.cliente.nombres} {item.cliente.apellidos}</h3>
                        <p className="text-sm opacity-60">📍 {item.cliente.zona || item.cliente.direccion}</p>
                      </div>
                      <p className="font-bold text-green-500">Q{Number(item.montoCuota).toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SIN COBROS */}
          {datos.totalPendientes === 0 && datos.totalCobrados === 0 && (
            <div
              className="rounded-2xl p-10 text-center shadow"
              style={{ backgroundColor: "var(--card)", border: "1px solid var(--card-border)" }}
            >
              <p className="text-5xl mb-4">🎉</p>
              <p className="text-xl font-bold">¡No hay cobros para hoy!</p>
              <p className="text-sm opacity-60 mt-1">
                No hay préstamos con visita programada para {hoyNombre}.
              </p>
            </div>
          )}
        </>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={closeToast} />}
    </div>
  );
}