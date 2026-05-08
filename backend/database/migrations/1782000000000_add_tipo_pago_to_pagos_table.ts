import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'pagos'

  public async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('tipo_pago').notNullable().defaultTo('cuota')
    })
  }

  public async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('tipo_pago')
    })
  }
}
