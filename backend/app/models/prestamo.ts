import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, hasMany, computed } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import Client from '#models/client'
import Pago from '#models/pago'
import Lote from '#models/lote'
import ProgramacionPago from '#models/programacion_pago'

export default class Prestamo extends BaseModel {
  public static table = 'ventas'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare clienteId: number

  @column()
  declare loteId: number | null

  @column()
  declare monto: number

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

  @column.date()
  declare fechaCobro: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => Client, {
    foreignKey: 'clienteId',
  })
  declare cliente: BelongsTo<typeof Client>

  @belongsTo(() => Lote, {
    foreignKey: 'loteId',
  })
  declare lote: BelongsTo<typeof Lote>

  @hasMany(() => Pago, {
    foreignKey: 'prestamoId',
  })
  declare pagos: HasMany<typeof Pago>

  @hasMany(() => ProgramacionPago, {
    foreignKey: 'prestamoId',
  })
  declare programaciones: HasMany<typeof ProgramacionPago>

  @computed({ serializeAs: 'numeroLote' })
  get numeroLote() {
    return this.lote?.numero ?? null
  }

  @computed({ serializeAs: 'medidaLote' })
  get medidaLote() {
    return this.lote?.medida ?? null
  }

  @computed({ serializeAs: 'areaLote' })
  get areaLote() {
    return this.lote?.area ?? null
  }
}
