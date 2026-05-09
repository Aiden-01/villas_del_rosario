import vine from '@vinejs/vine'

const isoDate = /^\d{4}-\d{2}-\d{2}$/

export const createVentaValidator = vine.compile(
  vine.object({
    clienteId: vine.number().positive().withoutDecimals(),
    monto: vine.number().positive(),
    cuotas: vine.number().positive().withoutDecimals().max(600),
    fechaInicio: vine.string().trim().regex(isoDate),
    fechaFin: vine.string().trim().regex(isoDate),
    frecuenciaPago: vine.enum(['mensual']).optional(),
    numeroLote: vine.string().trim().minLength(1).maxLength(50),
    medidaLote: vine.string().trim().maxLength(100).optional(),
    areaLote: vine.string().trim().maxLength(100).optional(),
    fechaCobro: vine.string().trim().regex(isoDate).optional(),
    enganche: vine.number().min(0).optional(),
  })
)

export const updateVentaValidator = vine.compile(
  vine.object({
    monto: vine.number().positive().optional(),
    cuotas: vine.number().positive().withoutDecimals().max(600).optional(),
    fechaInicio: vine.string().trim().regex(isoDate).optional(),
    fechaFin: vine.string().trim().regex(isoDate).optional(),
    frecuenciaPago: vine.enum(['mensual']).optional(),
    numeroLote: vine.string().trim().minLength(1).maxLength(50).optional(),
    medidaLote: vine.string().trim().maxLength(100).optional(),
    areaLote: vine.string().trim().maxLength(100).optional(),
    fechaCobro: vine.string().trim().regex(isoDate).optional(),
    estado: vine.enum(['activo', 'pagado', 'vencido', 'cancelado']).optional(),
  })
)
