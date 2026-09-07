import { BaseSchema } from '@adonisjs/lucid/schema';
export default class extends BaseSchema {
    async up() {
        await this.db.rawQuery(`
      ALTER TABLE pagos
        ADD COLUMN IF NOT EXISTS anulado BOOLEAN NOT NULL DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS anulado_at TIMESTAMP NULL,
        ADD COLUMN IF NOT EXISTS anulado_por INTEGER REFERENCES users(id) ON DELETE SET NULL NULL,
        ADD COLUMN IF NOT EXISTS motivo_anulacion TEXT NULL;
    `);
        await this.db.rawQuery(`
      ALTER TABLE ventas
        ADD COLUMN IF NOT EXISTS cancelado_at TIMESTAMP NULL,
        ADD COLUMN IF NOT EXISTS cancelado_por INTEGER REFERENCES users(id) ON DELETE SET NULL NULL,
        ADD COLUMN IF NOT EXISTS motivo_cancelacion TEXT NULL;
    `);
        await this.db.rawQuery(`
      ALTER TABLE clientes
        ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT TRUE,
        ADD COLUMN IF NOT EXISTS desactivado_at TIMESTAMP NULL,
        ADD COLUMN IF NOT EXISTS desactivado_por INTEGER REFERENCES users(id) ON DELETE SET NULL NULL;
    `);
    }
    async down() {
    }
}
//# sourceMappingURL=1790000000000_add_soft_delete_columns.js.map