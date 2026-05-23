import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column, computed } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Prestamo from '#models/prestamo'
import Lote from '#models/lote'

export default class VentaPredio extends BaseModel {
  public static table = 'venta_predios'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare ventaId: number

  @column()
  declare loteId: number | null

  @column()
  declare precio: number | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => Prestamo, {
    foreignKey: 'ventaId',
  })
  declare venta: BelongsTo<typeof Prestamo>

  @belongsTo(() => Lote, {
    foreignKey: 'loteId',
  })
  declare lote: BelongsTo<typeof Lote>

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
