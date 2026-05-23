import { BaseSchema } from '@adonisjs/lucid/schema';
export default class extends BaseSchema {
    tableName = 'pagos';
    async up() {
        this.schema.alterTable(this.tableName, (table) => {
            table.string('tipo_pago').notNullable().defaultTo('cuota');
        });
    }
    async down() {
        this.schema.alterTable(this.tableName, (table) => {
            table.dropColumn('tipo_pago');
        });
    }
}
//# sourceMappingURL=1782000000000_add_tipo_pago_to_pagos_table.js.map