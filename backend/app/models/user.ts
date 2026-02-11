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

  @column()
  declare username: string

  @column()
  declare role: 'admin' | 'trabajador'

  @column({ serializeAs: null })
  declare password: string

  @hasMany(() => ApiToken)
  declare apiTokens: HasMany<typeof ApiToken>

  @column.dateTime({ autoCreate: true })
  declare createdAt: Date

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: Date

  @beforeSave()
  static async hashPassword(user: User) {
    if (user.$dirty.password) {
      user.password = await Hash.make(user.password)
    }
  }

  // Método estático para verificar credenciales
  static async verifyCredentials(username: string, password: string) {
    const user = await this.findBy('username', username)
    
    if (!user) {
      throw new Error('USER_NOT_FOUND')
    }
    
    const isValid = await Hash.verify(user.password, password)
    
    if (!isValid) {
      throw new Error('INVALID_PASSWORD')
    }
    
    return user
  }
}