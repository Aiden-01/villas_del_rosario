import { BaseSchema } from '@adonisjs/lucid/schema';
export default class extends BaseSchema {
    tableName = 'clientes';
    async up() {
        this.schema.createTable(this.tableName, (table) => {
            table.increments('id');
            table.string('dpi').notNullable().unique();
            table.string('nombres').notNullable();
            table.string('apellidos').notNullable();
            table.string('telefono').notNullable();
            table.string('direccion').notNullable();
            table.timestamp('created_at');
            table.timestamp('updated_at');
        });
    }
    async down() {
        this.schema.dropTable(this.tableName);
    }
}
//# sourceMappingURL=1773453622501_create_create_clientes_table.js.map