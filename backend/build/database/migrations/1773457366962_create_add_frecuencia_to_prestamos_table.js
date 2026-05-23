import { BaseSchema } from '@adonisjs/lucid/schema';
export default class extends BaseSchema {
    tableName = 'prestamos';
    async up() {
        this.schema.alterTable(this.tableName, (table) => {
            table.string('frecuencia_pago').defaultTo('semanal').nullable();
            table.string('dia_visita').nullable();
        });
    }
    async down() {
        this.schema.alterTable(this.tableName, (table) => {
            table.dropColumn('frecuencia_pago');
            table.dropColumn('dia_visita');
        });
    }
}
//# sourceMappingURL=1773457366962_create_add_frecuencia_to_prestamos_table.js.map