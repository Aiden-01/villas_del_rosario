import vine from '@vinejs/vine'

const isoDate = /^\d{4}-\d{2}-\d{2}$/

export const createPagoValidator = vine.compile(
  vine.object({
    prestamoId: vine.number().positive().withoutDecimals().optional(),
    ventaId: vine.number().positive().withoutDecimals().optional(),
    numeroCuota: vine.number().positive().withoutDecimals(),
    montoPagado: vine.number().positive(),
    fechaPago: vine.string().trim().regex(isoDate),
  })
)

export const abonoValidator = vine.compile(
  vine.object({
    prestamoId: vine.number().positive().withoutDecimals().optional(),
    ventaId: vine.number().positive().withoutDecimals().optional(),
    monto: vine.number().positive(),
    fechaPago: vine.string().trim().regex(isoDate).optional(),
  })
)

export const programacionPagoValidator = vine.compile(
  vine.object({
    prestamoId: vine.number().positive().withoutDecimals().optional(),
    ventaId: vine.number().positive().withoutDecimals().optional(),
    tipoGestion: vine.enum(['no_pago', 'pago_parcial']),
    montoPagado: vine.number().positive().optional(),
    nota: vine.string().trim().minLength(1).maxLength(500),
    fechaProgramada: vine.string().trim().regex(isoDate),
  })
)
