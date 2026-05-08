import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Prestamo from '#models/prestamo'

export default class NotificacionCobro extends BaseModel {
  public static table = 'notificaciones_cobros'

  @column({ isPrimary: true })
  declare id: number

  @column({ columnName: 'venta_id' })
  declare prestamoId: number

  @column()
  declare numeroCuota: number

  @column.date({ columnName: 'fecha_programada' })
  declare fechaProgramada: DateTime

  @column()
  declare canal: string

  @column.dateTime({ columnName: 'sent_at' })
  declare sentAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => Prestamo, {
    foreignKey: 'prestamoId',
  })
  declare prestamo: BelongsTo<typeof Prestamo>
}
