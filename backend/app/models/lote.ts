import { DateTime } from 'luxon'
import { BaseModel, column, hasMany, hasOne } from '@adonisjs/lucid/orm'
import type { HasMany, HasOne } from '@adonisjs/lucid/types/relations'
import Prestamo from '#models/prestamo'
import LoteGeometria from '#models/lote_geometria'

export default class Lote extends BaseModel {
  public static table = 'lotes'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare numero: string

  @column()
  declare medida: string | null

  @column()
  declare area: string | null

  @column()
  declare estado: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @hasMany(() => Prestamo, {
    foreignKey: 'loteId',
  })
  declare ventas: HasMany<typeof Prestamo>

  @hasOne(() => LoteGeometria, {
    foreignKey: 'loteId',
  })
  declare geometria: HasOne<typeof LoteGeometria>
}
