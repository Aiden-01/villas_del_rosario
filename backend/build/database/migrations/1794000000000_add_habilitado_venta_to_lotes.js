import { BaseSchema } from '@adonisjs/lucid/schema';
export default class extends BaseSchema {
    tableName = 'lotes';
    async up() {
        this.schema.alterTable(this.tableName, (table) => {
            table.boolean('habilitado_venta').notNullable().defaultTo(false);
        });
    }
    async down() {
        this.schema.alterTable(this.tableName, (table) => {
            table.dropColumn('habilitado_venta');
        });
    }
}
//# sourceMappingURL=1794000000000_add_habilitado_venta_to_lotes.js.map