import { BaseModel, column, beforeSave, hasMany } from '@adonisjs/lucid/orm'
import Hash from '@adonisjs/core/services/hash'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import ApiToken from './api_token.js'

export default class User extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare name: string

  @column()
  declare email: string

  // ✅ NUEVO
  @column()
  declare username: string

  // ✅ NUEVO
  @column()
  declare role: 'admin' | 'trabajador'

  @column({ serializeAs: null })
  declare password: string

  @beforeSave()
  static async hashPassword(user: User) {
    if (user.$dirty.password) {
      user.password = await Hash.make(user.password)
    }
  }

  @hasMany(() => ApiToken)
  declare apiTokens: HasMany<typeof ApiToken>

  async verifyPassword(password: string) {
    return Hash.verify(this.password, password)
  }

  @column.dateTime({ autoCreate: true })
  declare createdAt: Date

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: Date
}
