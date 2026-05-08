import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'prestamos'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('frecuencia_pago').defaultTo('semanal').nullable()
      table.string('dia_visita').nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('frecuencia_pago')
      table.dropColumn('dia_visita')
    })
  }
}
