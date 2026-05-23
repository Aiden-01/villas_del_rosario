import { BaseSchema } from '@adonisjs/lucid/schema';
export default class extends BaseSchema {
    tableName = 'clientes';
    async up() {
        this.schema.alterTable(this.tableName, (table) => {
            table.integer('orden_visita').defaultTo(0).nullable();
        });
    }
    async down() {
        this.schema.alterTable(this.tableName, (table) => {
            table.dropColumn('orden_visita');
        });
    }
}
//# sourceMappingURL=1773626117659_create_add_orden_visita_to_clientes_table.js.map