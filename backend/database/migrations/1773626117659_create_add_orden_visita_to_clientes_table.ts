import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'clientes'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.integer('orden_visita').defaultTo(0).nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('orden_visita')
    })
  }
}