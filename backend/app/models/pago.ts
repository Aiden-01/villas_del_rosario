import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import Prestamo from '#models/prestamo'
import User from '#models/user'
import PagoAplicacion from '#models/pago_aplicacion'

export default class Pago extends BaseModel {
  public static table = 'pagos'

  @column({ isPrimary: true })
  declare id: number

  @column({ columnName: 'venta_id' })
  declare prestamoId: number

  @column()
  declare usuarioId: number | null

  @column()
  declare numeroCuota: number

  @column()
  declare montoPagado: number

  @column()
  declare tipoPago: string

  @column.date()
  declare fechaPago: DateTime

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  // Columnas de anulación
  @column()
  declare anulado: boolean

  @column.dateTime()
  declare anuladoAt: DateTime | null

  @column()
  declare anuladoPor: number | null

  @column()
  declare motivoAnulacion: string | null

  @belongsTo(() => Prestamo, {
    foreignKey: 'prestamoId',
  })
  declare prestamo: BelongsTo<typeof Prestamo>

  @belongsTo(() => User, {
    foreignKey: 'usuarioId',
  })
  declare usuario: BelongsTo<typeof User>

  @belongsTo(() => User, {
    foreignKey: 'anuladoPor',
  })
  declare anuladoPorUsuario: BelongsTo<typeof User>

  @hasMany(() => PagoAplicacion, {
    foreignKey: 'pagoId',
  })
  declare aplicaciones: HasMany<typeof PagoAplicacion>
}
