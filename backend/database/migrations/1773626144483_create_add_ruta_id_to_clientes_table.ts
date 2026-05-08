import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'clientes'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table
        .integer('ruta_id')
        .unsigned()
        .references('id')
        .inTable('rutas')
        .onDelete('SET NULL')
        .nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('ruta_id')
    })
  }
}
