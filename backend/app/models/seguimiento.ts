import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Prestamo from '#models/prestamo'
import User from '#models/user'

export default class Seguimiento extends BaseModel {
  public static table = 'seguimientos'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare prestamoId: number

  @column()
  declare usuarioId: number | null

  @column()
  declare tipo: 'no_pago' | 'pago_parcial'

  @column()
  declare montoPagado: number

  @column()
  declare nota: string | null

  @column.date()
  declare fechaSeguimiento: DateTime

  @column()
  declare resuelta: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @belongsTo(() => Prestamo, { foreignKey: 'prestamoId' })
  declare prestamo: BelongsTo<typeof Prestamo>

  @belongsTo(() => User, { foreignKey: 'usuarioId' })
  declare usuario: BelongsTo<typeof User>
}