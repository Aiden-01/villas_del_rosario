import { BaseModel, column, hasMany, belongsTo } from '@adonisjs/lucid/orm'
import type { HasMany, BelongsTo } from '@adonisjs/lucid/types/relations'
import Prestamo from '#models/prestamo'
import Ruta from '#models/ruta'

export default class Client extends BaseModel {
  public static table = 'clientes'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare dpi: string | null

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

  @column()
  declare rutaId: number | null

  @column()
  declare ordenVisita: number | null

  @belongsTo(() => Ruta, {
    foreignKey: 'rutaId',
  })
  declare ruta: BelongsTo<typeof Ruta>

  @hasMany(() => Prestamo, {
    foreignKey: 'clienteId',
  })
  declare prestamos: HasMany<typeof Prestamo>
}