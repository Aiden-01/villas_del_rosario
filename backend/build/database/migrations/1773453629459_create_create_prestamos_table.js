import { BaseSchema } from '@adonisjs/lucid/schema';
export default class extends BaseSchema {
    tableName = 'prestamos';
    async up() {
        this.schema.createTable(this.tableName, (table) => {
            table.increments('id');
            table
                .integer('cliente_id')
                .unsigned()
                .references('id')
                .inTable('clientes')
                .onDelete('CASCADE');
            table.decimal('monto', 10, 2).notNullable();
            table.decimal('interes', 5, 2).notNullable();
            table.integer('cuotas').notNullable();
            table.date('fecha_inicio').notNullable();
            table.date('fecha_fin').notNullable();
            table.string('estado').defaultTo('activo');
            table.timestamp('created_at');
            table.timestamp('updated_at');
        });
    }
    async down() {
        this.schema.dropTable(this.tableName);
    }
}
//# sourceMappingURL=1773453629459_create_create_prestamos_table.js.map