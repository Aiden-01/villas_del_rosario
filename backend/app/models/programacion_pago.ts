import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Prestamo from '#models/prestamo'
import User from '#models/user'

export default class ProgramacionPago extends BaseModel {
  public static table = 'programaciones_pago'

  @column({ isPrimary: true })
  declare id: number

  @column({ columnName: 'venta_id' })
  declare prestamoId: number

  @column()
  declare usuarioId: number | null

  @column()
  declare numeroCuota: number

  @column({ columnName: 'tipo_gestion' })
  declare tipoGestion: string

  @column({ columnName: 'monto_recibido' })
  declare montoRecibido: number

  @column()
  declare nota: string | null

  @column.date({ columnName: 'fecha_programada' })
  declare fechaProgramada: DateTime

  @column()
  declare resuelto: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => Prestamo, {
    foreignKey: 'prestamoId',
  })
  declare prestamo: BelongsTo<typeof Prestamo>

  @belongsTo(() => User, {
    foreignKey: 'usuarioId',
  })
  declare usuario: BelongsTo<typeof User>
}
