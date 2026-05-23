import { BaseSchema } from '@adonisjs/lucid/schema';
export default class extends BaseSchema {
    tableName = 'rutas';
    async up() {
        this.schema.alterTable(this.tableName, (table) => {
            table.integer('orden').defaultTo(0).nullable();
        });
    }
    async down() {
        this.schema.alterTable(this.tableName, (table) => {
            table.dropColumn('orden');
        });
    }
}
//# sourceMappingURL=1773626167143_create_add_orden_to_rutas_table.js.map