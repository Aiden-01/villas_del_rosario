import { useState, useEffect } from "react";
import { authFetch } from "../services/api";
import { useToast } from "../hooks/useToast";
import Toast from "../components/Toast";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3333";

export default function RutaDelDia() {
  const [datos, setDatos] = useState(null);
  const [loading, setLoading] = useState(true);
  const [registrando, setRegistrando] = useState(null);
  const { toast, showToast } = useToast();

  const diasSemana = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];
  const hoyNombre = diasSemana[new Date().getDay()];

  const cargarRuta = async () => {
    try {
      const res = await authFetch(`${API_URL}/api/rutas/hoy`);
      const data = await res.json();
      setDatos(data);
    } catch {
      showToast("Error al cargar la ruta", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarRuta();
  }, []);

  const registrarPago = async (item) => {
    setRegistrando(item.prestamoId);
    try {
      const hoy = new Date().toISOString().split("T")[0];
      const res = await authFetch(`${API_URL}/api/pagos`, {
        method: "POST",
        body: JSON.stringify({
          prestamoId: item.prestamoId,
          numeroCuota: item.proximaCuota,
          montoPagado: item.montoCuota,
          fechaPago: hoy,
        }),
      });

      if (res.ok) {
        showToast(`✅ Pago de ${item.cliente.nombres} registrado`, "success");
        cargarRuta();
      } else {
        const err = await res.json();
        showToast(err.message || "Error al registrar pago", "error");
      }
    } catch {
      showToast("Error al registrar pago", "error");
    } finally {
      setRegistrando(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p style={{ color: "var(--text-muted)" }}>Cargando ruta...</p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 pb-10">
      <Toast toast={toast} />

      {/* ENCABEZADO */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>
          📍 Ruta de Hoy
        </h1>
        <p style={{ color: "var(--text-muted)" }}>
          {hoyNombre} — {new Date().toLocaleDateString("es-GT")}
        </p>
      </div>

      {/* RESUMEN */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="rounded-xl p-3 text-center" style={{ backgroundColor: "var(--card)", border: "1px solid var(--card-border)" }}>
          <p className="text-2xl font-bold" style={{ color: "var(--primary)" }}>
            {datos?.totalPendientes || 0}
          </p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>Pendientes</p>
        </div>
        <div className="rounded-xl p-3 text-center" style={{ backgroundColor: "var(--card)", border: "1px solid var(--card-border)" }}>
          <p className="text-2xl font-bold text-green-500">{datos?.totalCobrados || 0}</p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>Cobrados</p>
        </div>
        <div className="rounded-xl p-3 text-center" style={{ backgroundColor: "var(--card)", border: "1px solid var(--card-border)" }}>
          <p className="text-lg font-bold text-green-500">
            Q{Number(datos?.totalRecaudado || 0).toFixed(2)}
          </p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>Recaudado</p>
        </div>
      </div>

      {/* PENDIENTES */}
      {datos?.pendientes?.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-bold mb-3" style={{ color: "var(--text)" }}>
            ⏳ Pendientes
          </h2>
          <div className="space-y-3">
            {datos.pendientes.map((item) => (
              <div
                key={item.prestamoId}
                className="rounded-2xl p-4 shadow"
                style={{ backgroundColor: "var(--card)", border: "1px solid var(--card-border)" }}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-bold text-lg" style={{ color: "var(--text)" }}>
                      {item.cliente.nombres} {item.cliente.apellidos}
                    </p>
                    <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                      📍 {item.cliente.zona || item.cliente.direccion}
                    </p>
                    <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                      📞 {item.cliente.telefono}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-green-500">
                      Q{Number(item.montoCuota).toFixed(2)}
                    </p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                      Cuota {item.proximaCuota}/{item.totalCuotas}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => registrarPago(item)}
                  disabled={registrando === item.prestamoId}
                  className="w-full py-3 rounded-xl font-bold text-white text-lg transition hover:opacity-90 active:scale-95"
                  style={{ backgroundColor: registrando === item.prestamoId ? "#aaa" : "#16a34a" }}
                >
                  {registrando === item.prestamoId ? "Registrando..." : "✓ Registrar Pago"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* COBRADOS */}
      {datos?.cobrados?.length > 0 && (
        <div>
          <h2 className="text-lg font-bold mb-3" style={{ color: "var(--text)" }}>
            ✅ Cobrados hoy
          </h2>
          <div className="space-y-2">
            {datos.cobrados.map((item) => (
              <div
                key={item.prestamoId}
                className="rounded-2xl p-4 opacity-60"
                style={{ backgroundColor: "var(--card)", border: "1px solid var(--card-border)" }}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-bold" style={{ color: "var(--text)" }}>
                      ✅ {item.cliente.nombres} {item.cliente.apellidos}
                    </p>
                    <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                      📍 {item.cliente.zona || item.cliente.direccion}
                    </p>
                  </div>
                  <p className="font-bold text-green-500">
                    Q{Number(item.montoCuota).toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SI NO HAY NADA */}
      {datos?.totalPendientes === 0 && datos?.totalCobrados === 0 && (
        <div className="text-center py-16">
          <p className="text-5xl mb-4">🎉</p>
          <p className="text-xl font-bold" style={{ color: "var(--text)" }}>
            ¡No hay cobros para hoy!
          </p>
          <p style={{ color: "var(--text-muted)" }}>
            No hay préstamos con visita programada para {hoyNombre}.
          </p>
        </div>
      )}
    </div>
  );
}