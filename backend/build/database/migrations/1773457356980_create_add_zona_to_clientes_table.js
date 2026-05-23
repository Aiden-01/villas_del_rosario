import { BaseSchema } from '@adonisjs/lucid/schema';
export default class extends BaseSchema {
    tableName = 'clientes';
    async up() {
        this.schema.alterTable(this.tableName, (table) => {
            table.string('zona').nullable();
        });
    }
    async down() {
        this.schema.alterTable(this.tableName, (table) => {
            table.dropColumn('zona');
        });
    }
}
//# sourceMappingURL=1773457356980_create_add_zona_to_clientes_table.js.map