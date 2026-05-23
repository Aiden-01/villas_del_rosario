import { BaseSchema } from '@adonisjs/lucid/schema';
export default class extends BaseSchema {
    tableName = 'programaciones_pago';
    async up() {
        this.schema.createTable(this.tableName, (table) => {
            table.increments('id');
            table.integer('venta_id').unsigned().references('id').inTable('ventas').onDelete('CASCADE');
            table
                .integer('usuario_id')
                .unsigned()
                .references('id')
                .inTable('users')
                .onDelete('SET NULL')
                .nullable();
            table.integer('numero_cuota').notNullable();
            table.string('tipo_gestion').notNullable();
            table.decimal('monto_recibido', 10, 2).defaultTo(0);
            table.text('nota').nullable();
            table.date('fecha_programada').notNullable();
            table.boolean('resuelto').notNullable().defaultTo(false);
            table.timestamp('created_at');
            table.timestamp('updated_at');
        });
    }
    async down() {
        this.schema.dropTable(this.tableName);
    }
}
//# sourceMappingURL=1780000000000_create_programaciones_pago_table.js.map