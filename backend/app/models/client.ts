import { DateTime } from 'luxon'
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

  // Columnas de desactivación (soft-delete)
  @column()
  declare activo: boolean

  @column.dateTime()
  declare desactivadoAt: DateTime | null

  @column()
  declare desactivadoPor: number | null

  @hasMany(() => Prestamo, {
    foreignKey: 'clienteId',
  })
  declare prestamos: HasMany<typeof Prestamo>
}
