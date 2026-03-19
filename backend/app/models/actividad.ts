import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/user'

export default class Actividad extends BaseModel {
  public static table = 'actividades'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare usuarioId: number | null

  @column()
  declare tipo: string

  @column()
  declare entidad: string

  @column()
  declare entidadId: number | null

  @column()
  declare descripcion: string

  @column()
  declare detalle: object | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @belongsTo(() => User, {
    foreignKey: 'usuarioId',
  })
  declare usuario: BelongsTo<typeof User>
}