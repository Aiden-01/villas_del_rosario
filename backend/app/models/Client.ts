import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class Client extends BaseModel {
  public static table = 'clientes'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare dpi: string

  @column()
  declare nombres: string

  @column()
  declare apellidos: string

  @column()
  declare telefono: string

  @column()
  declare direccion: string
}