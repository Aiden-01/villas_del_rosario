import { BaseSchema } from '@adonisjs/lucid/schema';
export default class extends BaseSchema {
    tableName = 'seguimientos';
    async up() {
        this.schema.createTable(this.tableName, (table) => {
            table.increments('id');
            table
                .integer('prestamo_id')
                .unsigned()
                .references('id')
                .inTable('prestamos')
                .onDelete('CASCADE');
            table
                .integer('usuario_id')
                .unsigned()
                .references('id')
                .inTable('users')
                .onDelete('SET NULL')
                .nullable();
            table.string('tipo').notNullable();
            table.decimal('monto_pagado', 10, 2).defaultTo(0);
            table.text('nota').nullable();
            table.date('fecha_seguimiento').notNullable();
            table.boolean('resuelta').defaultTo(false);
            table.timestamp('created_at');
        });
    }
    async down() {
        this.schema.dropTable(this.tableName);
    }
}
//# sourceMappingURL=1774131070650_create_create_seguimientos_table.js.map