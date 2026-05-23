import { BaseSchema } from '@adonisjs/lucid/schema';
export default class extends BaseSchema {
    tableName = 'actividades';
    async up() {
        this.schema.createTable(this.tableName, (table) => {
            table.increments('id');
            table
                .integer('usuario_id')
                .unsigned()
                .references('id')
                .inTable('users')
                .onDelete('SET NULL')
                .nullable();
            table.string('tipo').notNullable();
            table.string('entidad').notNullable();
            table.integer('entidad_id').nullable();
            table.string('descripcion').notNullable();
            table.json('detalle').nullable();
            table.timestamp('created_at');
        });
    }
    async down() {
        this.schema.dropTable(this.tableName);
    }
}
//# sourceMappingURL=1773901034150_create_create_actividades_table.js.map