import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'actividades'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table
        .integer('usuario_id')
        .unsigned()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
        .nullable()
      table.string('tipo').notNullable()
      // crear, actualizar, eliminar, pago, login
      table.string('entidad').notNullable()
      // cliente, prestamo, pago, ruta, usuario
      table.integer('entidad_id').nullable()
      table.string('descripcion').notNullable()
      table.json('detalle').nullable()
      table.timestamp('created_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
