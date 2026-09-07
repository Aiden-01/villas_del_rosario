export function crearSolicitudAnulacionPago(basePagos, pagoId, motivo) {
  return {
    url: `${basePagos}/${pagoId}/anular`,
    options: {
      method: "POST",
      body: JSON.stringify({ motivo }),
    },
  };
}

export function crearSolicitudCancelacionVenta(baseVentas, ventaId, motivo) {
  return {
    url: `${baseVentas}/${ventaId}`,
    options: {
      method: "DELETE",
      body: JSON.stringify({ motivo }),
    },
  };
}

export function validarMontoPagoVenta(monto, saldoPendiente) {
  const montoNumerico = Number(monto);
  const saldoNumerico = Number(saldoPendiente);

  if (!Number.isFinite(montoNumerico) || montoNumerico <= 0) {
    return "Ingresa el monto recibido";
  }

  if (Number.isFinite(saldoNumerico) && montoNumerico - saldoNumerico > 0.005) {
    return "El pago no puede exceder el saldo total de la venta";
  }

  return null;
}

export function crearSolicitudAbonoVenta(basePagos, ventaId, monto, fechaPago) {
  return {
    url: `${basePagos}/abonos`,
    options: {
      method: "POST",
      body: JSON.stringify({
        ventaId,
        monto: Number(monto),
        fechaPago,
      }),
    },
  };
}
