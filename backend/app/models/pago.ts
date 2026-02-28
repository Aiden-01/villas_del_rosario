import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Prestamo from '#models/prestamo'
import User from '#models/user'

export default class Pago extends BaseModel {
  public static table = 'pagos'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare prestamoId: number

  @column()
  declare usuarioId: number | null

  @column()
  declare numeroCuota: number

  @column()
  declare montoPagado: number

  @column.date()
  declare fechaPago: DateTime

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @belongsTo(() => Prestamo, {
    foreignKey: 'prestamoId',
  })
  declare prestamo: BelongsTo<typeof Prestamo>

  @belongsTo(() => User, {
    foreignKey: 'usuarioId',
  })
  declare usuario: BelongsTo<typeof User>
}