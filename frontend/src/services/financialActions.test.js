import test from "node:test";
import assert from "node:assert/strict";
import {
  crearSolicitudAbonoVenta,
  crearSolicitudAnulacionPago,
  crearSolicitudCancelacionVenta,
  validarMontoPagoVenta,
} from "./financialActions.js";

test("la anulacion oficial usa POST y envia el motivo", () => {
  const solicitud = crearSolicitudAnulacionPago("http://api.test/api/pagos", 7, "Pago duplicado");

  assert.equal(solicitud.url, "http://api.test/api/pagos/7/anular");
  assert.equal(solicitud.options.method, "POST");
  assert.deepEqual(JSON.parse(solicitud.options.body), { motivo: "Pago duplicado" });
});

test("la cancelacion de venta conserva DELETE y envia el motivo", () => {
  const solicitud = crearSolicitudCancelacionVenta("http://api.test/api/ventas", 9, "Venta rescindida");

  assert.equal(solicitud.url, "http://api.test/api/ventas/9");
  assert.equal(solicitud.options.method, "DELETE");
  assert.deepEqual(JSON.parse(solicitud.options.body), { motivo: "Venta rescindida" });
});

test("el pago de agenda usa un unico abono y limita contra el saldo total", () => {
  const pendienteCuotaActual = 5_000;
  assert.ok(12_000 > pendienteCuotaActual);
  assert.equal(validarMontoPagoVenta(12_000, 100_000), null);
  assert.equal(
    validarMontoPagoVenta(100_000.01, 100_000),
    "El pago no puede exceder el saldo total de la venta"
  );

  const solicitud = crearSolicitudAbonoVenta(
    "http://api.test/api/pagos",
    21,
    12_000,
    "2026-09-06"
  );

  assert.equal(solicitud.url, "http://api.test/api/pagos/abonos");
  assert.equal(solicitud.options.method, "POST");
  assert.deepEqual(JSON.parse(solicitud.options.body), {
    ventaId: 21,
    monto: 12_000,
    fechaPago: "2026-09-06",
  });
});
