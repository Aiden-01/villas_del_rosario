import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  public async up() {
    await this.db.rawQuery(`
      CREATE TABLE IF NOT EXISTS pago_aplicaciones (
        id SERIAL PRIMARY KEY,
        pago_id INTEGER NOT NULL,
        venta_id INTEGER NOT NULL,
        numero_cuota INTEGER NOT NULL CHECK (numero_cuota >= 1),
        monto_aplicado NUMERIC(12, 2) NOT NULL CHECK (monto_aplicado > 0),
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        CONSTRAINT fk_pa_pago FOREIGN KEY (pago_id) REFERENCES pagos(id) ON DELETE RESTRICT,
        CONSTRAINT fk_pa_venta FOREIGN KEY (venta_id) REFERENCES ventas(id) ON DELETE RESTRICT
      );
    `)

    await this.db.rawQuery(`
      CREATE INDEX IF NOT EXISTS idx_pago_aplicaciones_pago ON pago_aplicaciones(pago_id);
    `)

    await this.db.rawQuery(`
      CREATE INDEX IF NOT EXISTS idx_pago_aplicaciones_venta ON pago_aplicaciones(venta_id);
    `)

    await this.db.rawQuery(`
      CREATE INDEX IF NOT EXISTS idx_pago_aplicaciones_venta_cuota ON pago_aplicaciones(venta_id, numero_cuota);
    `)
  }

  public async down() {
    await this.db.rawQuery('DROP TABLE IF EXISTS pago_aplicaciones;')
  }
}
