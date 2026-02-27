import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Client from '#models/client'

export default class Prestamo extends BaseModel {
  public static table = 'prestamos'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare clienteId: number

  @column()
  declare monto: number

  @column()
  declare interes: number

  @column()
  declare cuotas: number

  @column.date()
  declare fechaInicio: DateTime

  @column.date()
  declare fechaFin: DateTime

  @column()
  declare estado: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @belongsTo(() => Client, {
    foreignKey: 'clienteId',
  })
  declare cliente: BelongsTo<typeof Client>
}