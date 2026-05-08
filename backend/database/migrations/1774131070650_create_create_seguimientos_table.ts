import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'seguimientos'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table
        .integer('prestamo_id')
        .unsigned()
        .references('id')
        .inTable('prestamos')
        .onDelete('CASCADE')
      table
        .integer('usuario_id')
        .unsigned()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
        .nullable()
      // tipo: 'no_pago' | 'pago_parcial'
      table.string('tipo').notNullable()
      // monto pagado (0 si no_pago, menor a cuota si pago_parcial)
      table.decimal('monto_pagado', 10, 2).defaultTo(0)
      // nota del cobrador (por qué no pagó, qué acordaron, etc.)
      table.text('nota').nullable()
      // fecha en que el cobrador quiere volver a pasar
      table.date('fecha_seguimiento').notNullable()
      // false = pendiente, true = ya se resolvió (cobró el restante)
      table.boolean('resuelta').defaultTo(false)
      table.timestamp('created_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
