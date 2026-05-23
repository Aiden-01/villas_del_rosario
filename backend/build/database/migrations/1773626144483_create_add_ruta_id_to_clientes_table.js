import { BaseSchema } from '@adonisjs/lucid/schema';
export default class extends BaseSchema {
    tableName = 'clientes';
    async up() {
        this.schema.alterTable(this.tableName, (table) => {
            table
                .integer('ruta_id')
                .unsigned()
                .references('id')
                .inTable('rutas')
                .onDelete('SET NULL')
                .nullable();
        });
    }
    async down() {
        this.schema.alterTable(this.tableName, (table) => {
            table.dropColumn('ruta_id');
        });
    }
}
//# sourceMappingURL=1773626144483_create_add_ruta_id_to_clientes_table.js.map