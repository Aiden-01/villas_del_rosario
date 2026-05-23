import { BaseSchema } from '@adonisjs/lucid/schema';
export default class extends BaseSchema {
    tableName = 'users';
    async up() {
        this.schema.alterTable(this.tableName, (table) => {
            table.string('username').notNullable().unique();
            table.string('role').notNullable().defaultTo('trabajador');
        });
    }
    async down() {
        this.schema.alterTable(this.tableName, (table) => {
            table.dropColumn('username');
            table.dropColumn('role');
        });
    }
}
//# sourceMappingURL=1770688896450_create_add_username_and_role_to_users_table.js.map