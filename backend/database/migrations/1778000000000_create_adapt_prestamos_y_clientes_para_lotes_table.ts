import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected clientesTableName = 'clientes'
  protected prestamosTableName = 'prestamos'

  async up() {
    this.schema.alterTable(this.clientesTableName, (table) => {
      table.dropColumn('dpi')
    })

    this.schema.alterTable(this.prestamosTableName, (table) => {
      table.string('numero_lote').nullable()
      table.string('medida_lote').nullable()
      table.string('area_lote').nullable()
      table.string('tipo_cobro').defaultTo('manual').nullable()
      table.date('fecha_cobro').nullable()
      table.date('ultimo_pago_automatico').nullable()
      table.string('frecuencia_pago').defaultTo('mensual').alter()
    })
  }

  async down() {
    this.schema.alterTable(this.clientesTableName, (table) => {
      table.string('dpi').nullable()
    })

    this.schema.alterTable(this.prestamosTableName, (table) => {
      table.dropColumn('numero_lote')
      table.dropColumn('medida_lote')
      table.dropColumn('area_lote')
      table.dropColumn('tipo_cobro')
      table.dropColumn('fecha_cobro')
      table.dropColumn('ultimo_pago_automatico')
      table.string('frecuencia_pago').defaultTo('semanal').alter()
    })
  }
}
