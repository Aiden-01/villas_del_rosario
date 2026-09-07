import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Pago from '#models/pago'
import Prestamo from '#models/prestamo'

export default class PagoAplicacion extends BaseModel {
  public static table = 'pago_aplicaciones'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare pagoId: number

  @column({ columnName: 'venta_id' })
  declare ventaId: number

  @column()
  declare numeroCuota: number

  @column()
  declare montoAplicado: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @belongsTo(() => Pago, { foreignKey: 'pagoId' })
  declare pago: BelongsTo<typeof Pago>

  @belongsTo(() => Prestamo, { foreignKey: 'ventaId' })
  declare venta: BelongsTo<typeof Prestamo>
}
