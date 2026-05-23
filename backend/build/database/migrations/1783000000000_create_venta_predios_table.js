import { BaseSchema } from '@adonisjs/lucid/schema';
export default class extends BaseSchema {
    async up() {
        await this.db.rawQuery(`
      CREATE TABLE IF NOT EXISTS venta_predios (
        id SERIAL PRIMARY KEY,
        venta_id INTEGER NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
        lote_id INTEGER REFERENCES lotes(id) ON DELETE SET NULL,
        precio NUMERIC(15, 2),
        created_at TIMESTAMP,
        updated_at TIMESTAMP
      );
    `);
        await this.db.rawQuery(`
      INSERT INTO venta_predios (venta_id, lote_id, created_at, updated_at)
      SELECT id, lote_id, NOW(), NOW()
      FROM ventas
      WHERE lote_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1
          FROM venta_predios
          WHERE venta_predios.venta_id = ventas.id
        );
    `);
    }
    async down() {
        await this.db.rawQuery('DROP TABLE IF EXISTS venta_predios CASCADE;');
    }
}
//# sourceMappingURL=1783000000000_create_venta_predios_table.js.map