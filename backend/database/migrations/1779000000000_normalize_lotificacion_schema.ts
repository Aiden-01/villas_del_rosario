import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  public async up() {
    await this.db.rawQuery(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'prestamos'
        ) AND NOT EXISTS (
          SELECT 1
          FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'ventas'
        ) THEN
          ALTER TABLE prestamos RENAME TO ventas;
        END IF;
      END $$;
    `)

    await this.db.rawQuery(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'pagos' AND column_name = 'prestamo_id'
        ) AND NOT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'pagos' AND column_name = 'venta_id'
        ) THEN
          ALTER TABLE pagos RENAME COLUMN prestamo_id TO venta_id;
        END IF;
      END $$;
    `)

    await this.db.rawQuery(`
      CREATE TABLE IF NOT EXISTS lotes (
        id SERIAL PRIMARY KEY,
        numero VARCHAR(255) NOT NULL UNIQUE,
        medida VARCHAR(255),
        area VARCHAR(255),
        estado VARCHAR(30) NOT NULL DEFAULT 'disponible',
        created_at TIMESTAMP,
        updated_at TIMESTAMP
      );
    `)

    await this.db.rawQuery(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'ventas' AND column_name = 'lote_id'
        ) THEN
          ALTER TABLE ventas ADD COLUMN lote_id INTEGER REFERENCES lotes(id) ON DELETE SET NULL;
        END IF;
      END $$;
    `)

    await this.db.rawQuery(`
      INSERT INTO lotes (numero, medida, area, estado, created_at, updated_at)
      SELECT DISTINCT ON (numero_lote)
        numero_lote,
        medida_lote,
        area_lote,
        CASE WHEN estado IN ('activo', 'vencido', 'pagado', 'cancelado') THEN 'vendido' ELSE 'disponible' END,
        NOW(),
        NOW()
      FROM ventas
      WHERE numero_lote IS NOT NULL AND numero_lote <> ''
      ON CONFLICT (numero) DO UPDATE
      SET
        medida = COALESCE(EXCLUDED.medida, lotes.medida),
        area = COALESCE(EXCLUDED.area, lotes.area),
        estado = CASE
          WHEN lotes.estado = 'vendido' THEN lotes.estado
          ELSE EXCLUDED.estado
        END;
    `)

    await this.db.rawQuery(`
      UPDATE ventas v
      SET lote_id = l.id
      FROM lotes l
      WHERE v.numero_lote = l.numero
        AND v.lote_id IS NULL;
    `)

    await this.db.rawQuery(`
      ALTER TABLE ventas DROP COLUMN IF EXISTS interes;
      ALTER TABLE ventas DROP COLUMN IF EXISTS dia_visita;
      ALTER TABLE ventas DROP COLUMN IF EXISTS tipo_cobro;
      ALTER TABLE ventas DROP COLUMN IF EXISTS ultimo_pago_automatico;
      ALTER TABLE ventas DROP COLUMN IF EXISTS numero_lote;
      ALTER TABLE ventas DROP COLUMN IF EXISTS medida_lote;
      ALTER TABLE ventas DROP COLUMN IF EXISTS area_lote;
    `)

    await this.db.rawQuery(`
      ALTER TABLE clientes DROP COLUMN IF EXISTS ruta_id;
      ALTER TABLE clientes DROP COLUMN IF EXISTS orden_visita;
    `)

    await this.db.rawQuery('DROP TABLE IF EXISTS seguimientos CASCADE;')
    await this.db.rawQuery('DROP TABLE IF EXISTS rutas CASCADE;')
  }

  public async down() {
    await this.db.rawQuery(`
      ALTER TABLE ventas ADD COLUMN IF NOT EXISTS numero_lote VARCHAR(255);
      ALTER TABLE ventas ADD COLUMN IF NOT EXISTS medida_lote VARCHAR(255);
      ALTER TABLE ventas ADD COLUMN IF NOT EXISTS area_lote VARCHAR(255);
      ALTER TABLE ventas ADD COLUMN IF NOT EXISTS interes NUMERIC(5, 2) NOT NULL DEFAULT 0;
      ALTER TABLE ventas ADD COLUMN IF NOT EXISTS dia_visita VARCHAR(255);
      ALTER TABLE ventas ADD COLUMN IF NOT EXISTS tipo_cobro VARCHAR(255) DEFAULT 'manual';
      ALTER TABLE ventas ADD COLUMN IF NOT EXISTS ultimo_pago_automatico DATE;
    `)

    await this.db.rawQuery(`
      UPDATE ventas v
      SET
        numero_lote = l.numero,
        medida_lote = l.medida,
        area_lote = l.area
      FROM lotes l
      WHERE v.lote_id = l.id;
    `)

    await this.db.rawQuery(`
      ALTER TABLE ventas DROP COLUMN IF EXISTS lote_id;
    `)

    await this.db.rawQuery(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'pagos' AND column_name = 'venta_id'
        ) AND NOT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'pagos' AND column_name = 'prestamo_id'
        ) THEN
          ALTER TABLE pagos RENAME COLUMN venta_id TO prestamo_id;
        END IF;
      END $$;
    `)

    await this.db.rawQuery(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'ventas'
        ) AND NOT EXISTS (
          SELECT 1
          FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'prestamos'
        ) THEN
          ALTER TABLE ventas RENAME TO prestamos;
        END IF;
      END $$;
    `)

    await this.db.rawQuery('DROP TABLE IF EXISTS lotes CASCADE;')
  }
}
