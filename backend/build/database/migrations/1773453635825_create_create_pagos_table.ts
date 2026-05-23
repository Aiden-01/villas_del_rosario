import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'pagos'

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
      table.integer('numero_cuota').notNullable()
      table.decimal('monto_pagado', 10, 2).notNullable()
      table.date('fecha_pago').notNullable()
      table.timestamp('created_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
