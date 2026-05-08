import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'notificaciones_cobros'

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('venta_id').unsigned().references('id').inTable('ventas').onDelete('CASCADE')
      table.integer('numero_cuota').notNullable()
      table.date('fecha_programada').notNullable()
      table.string('canal').notNullable().defaultTo('email')
      table.timestamp('sent_at').nullable()
      table.timestamp('created_at')
      table.timestamp('updated_at')

      table.unique(['venta_id', 'numero_cuota', 'fecha_programada', 'canal'])
    })
  }

  public async down() {
    this.schema.dropTable(this.tableName)
  }
}
