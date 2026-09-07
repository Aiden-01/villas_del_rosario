import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  public async up() {
    // Columnas de anulación para la tabla pagos
    await this.db.rawQuery(`
      ALTER TABLE pagos
        ADD COLUMN IF NOT EXISTS anulado BOOLEAN NOT NULL DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS anulado_at TIMESTAMP NULL,
        ADD COLUMN IF NOT EXISTS anulado_por INTEGER REFERENCES users(id) ON DELETE SET NULL NULL,
        ADD COLUMN IF NOT EXISTS motivo_anulacion TEXT NULL;
    `)

    // Columnas de cancelación para la tabla ventas
    await this.db.rawQuery(`
      ALTER TABLE ventas
        ADD COLUMN IF NOT EXISTS cancelado_at TIMESTAMP NULL,
        ADD COLUMN IF NOT EXISTS cancelado_por INTEGER REFERENCES users(id) ON DELETE SET NULL NULL,
        ADD COLUMN IF NOT EXISTS motivo_cancelacion TEXT NULL;
    `)

    // Columnas de desactivación para la tabla clientes
    await this.db.rawQuery(`
      ALTER TABLE clientes
        ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT TRUE,
        ADD COLUMN IF NOT EXISTS desactivado_at TIMESTAMP NULL,
        ADD COLUMN IF NOT EXISTS desactivado_por INTEGER REFERENCES users(id) ON DELETE SET NULL NULL;
    `)
  }

  public async down() {
    // No-op: las columnas de auditoría/soft-delete no se deben eliminar en producción
    // ya que pueden contener información histórica valiosa.
    // Para hacer rollback en un entorno de desarrollo:
    // ALTER TABLE pagos DROP COLUMN IF EXISTS anulado, DROP COLUMN IF EXISTS anulado_at, DROP COLUMN IF EXISTS anulado_por, DROP COLUMN IF EXISTS motivo_anulacion;
    // ALTER TABLE ventas DROP COLUMN IF EXISTS cancelado_at, DROP COLUMN IF EXISTS cancelado_por, DROP COLUMN IF EXISTS motivo_cancelacion;
    // ALTER TABLE clientes DROP COLUMN IF EXISTS activo, DROP COLUMN IF EXISTS desactivado_at, DROP COLUMN IF EXISTS desactivado_por;
  }
}
