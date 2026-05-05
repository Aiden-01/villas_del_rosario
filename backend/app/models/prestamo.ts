import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import Client from '#models/client'
import Pago from '#models/pago'

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

  @column()
  declare frecuenciaPago: string | null

  @column()
  declare diaVisita: string | null

  @column()
  declare numeroLote: string | null

  @column()
  declare medidaLote: string | null

  @column()
  declare areaLote: string | null

  @column()
  declare tipoCobro: string | null

  @column.date()
  declare fechaCobro: DateTime | null

  @column.date()
  declare ultimoPagoAutomatico: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @belongsTo(() => Client, {
    foreignKey: 'clienteId',
  })
  declare cliente: BelongsTo<typeof Client>

  @hasMany(() => Pago, {
    foreignKey: 'prestamoId',
  })
  declare pagos: HasMany<typeof Pago>
}
