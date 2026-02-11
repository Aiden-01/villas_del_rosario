import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from './user.js'

export default class ApiToken extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare userId: number

  @column()
  declare type: string

  @column()
  declare token: string

  @column()
  declare expiresAt: Date | null

  @column.dateTime()
  declare createdAt: Date

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>
}
