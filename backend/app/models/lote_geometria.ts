import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Lote from '#models/lote'

export default class LoteGeometria extends BaseModel {
  public static table = 'lote_geometrias'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare loteId: number

  @column()
  declare codigo: string

  @column()
  declare areaFuente: number | null

  @column()
  declare geom: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => Lote, {
    foreignKey: 'loteId',
  })
  declare lote: BelongsTo<typeof Lote>
}
