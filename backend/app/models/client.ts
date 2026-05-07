import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import Prestamo from '#models/prestamo'

export default class Client extends BaseModel {
  public static table = 'clientes'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare nombres: string

  @column()
  declare apellidos: string

  @column()
  declare telefono: string

  @column()
  declare direccion: string

  @column()
  declare zona: string | null

  @hasMany(() => Prestamo, {
    foreignKey: 'clienteId',
  })
  declare prestamos: HasMany<typeof Prestamo>
}
