import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  public async up() {
    // --- ventas.cliente_id: CASCADE → RESTRICT ---
    await this.db.rawQuery(`
      DO $$
      DECLARE
        r RECORD;
      BEGIN
        FOR r IN
          SELECT tc.constraint_name
          FROM information_schema.table_constraints tc
          JOIN information_schema.referential_constraints rc
            ON tc.constraint_name = rc.constraint_name AND tc.constraint_schema = rc.constraint_schema
          JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
          WHERE tc.table_name = 'ventas'
            AND kcu.column_name = 'cliente_id'
            AND tc.constraint_type = 'FOREIGN KEY'
            AND rc.delete_rule = 'CASCADE'
        LOOP
          EXECUTE 'ALTER TABLE ventas DROP CONSTRAINT IF EXISTS ' || quote_ident(r.constraint_name);
        END LOOP;
      END $$;
    `)
    await this.db.rawQuery(`
      ALTER TABLE ventas
        ADD CONSTRAINT ventas_cliente_id_fk
        FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE RESTRICT;
    `)

    // --- pagos.venta_id: CASCADE → RESTRICT ---
    await this.db.rawQuery(`
      DO $$
      DECLARE
        r RECORD;
      BEGIN
        FOR r IN
          SELECT tc.constraint_name
          FROM information_schema.table_constraints tc
          JOIN information_schema.referential_constraints rc
            ON tc.constraint_name = rc.constraint_name AND tc.constraint_schema = rc.constraint_schema
          JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
          WHERE tc.table_name = 'pagos'
            AND kcu.column_name = 'venta_id'
            AND tc.constraint_type = 'FOREIGN KEY'
            AND rc.delete_rule = 'CASCADE'
        LOOP
          EXECUTE 'ALTER TABLE pagos DROP CONSTRAINT IF EXISTS ' || quote_ident(r.constraint_name);
        END LOOP;
      END $$;
    `)
    await this.db.rawQuery(`
      ALTER TABLE pagos
        ADD CONSTRAINT pagos_venta_id_fk
        FOREIGN KEY (venta_id) REFERENCES ventas(id) ON DELETE RESTRICT;
    `)

    // --- programaciones_pago.venta_id: CASCADE → RESTRICT ---
    await this.db.rawQuery(`
      DO $$
      DECLARE
        r RECORD;
      BEGIN
        FOR r IN
          SELECT tc.constraint_name
          FROM information_schema.table_constraints tc
          JOIN information_schema.referential_constraints rc
            ON tc.constraint_name = rc.constraint_name AND tc.constraint_schema = rc.constraint_schema
          JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
          WHERE tc.table_name = 'programaciones_pago'
            AND kcu.column_name = 'venta_id'
            AND tc.constraint_type = 'FOREIGN KEY'
            AND rc.delete_rule = 'CASCADE'
        LOOP
          EXECUTE 'ALTER TABLE programaciones_pago DROP CONSTRAINT IF EXISTS ' || quote_ident(r.constraint_name);
        END LOOP;
      END $$;
    `)
    await this.db.rawQuery(`
      ALTER TABLE programaciones_pago
        ADD CONSTRAINT programaciones_pago_venta_id_fk
        FOREIGN KEY (venta_id) REFERENCES ventas(id) ON DELETE RESTRICT;
    `)

    // --- venta_predios.venta_id: CASCADE → RESTRICT ---
    await this.db.rawQuery(`
      DO $$
      DECLARE
        r RECORD;
      BEGIN
        FOR r IN
          SELECT tc.constraint_name
          FROM information_schema.table_constraints tc
          JOIN information_schema.referential_constraints rc
            ON tc.constraint_name = rc.constraint_name AND tc.constraint_schema = rc.constraint_schema
          JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
          WHERE tc.table_name = 'venta_predios'
            AND kcu.column_name = 'venta_id'
            AND tc.constraint_type = 'FOREIGN KEY'
            AND rc.delete_rule = 'CASCADE'
        LOOP
          EXECUTE 'ALTER TABLE venta_predios DROP CONSTRAINT IF EXISTS ' || quote_ident(r.constraint_name);
        END LOOP;
      END $$;
    `)
    await this.db.rawQuery(`
      ALTER TABLE venta_predios
        ADD CONSTRAINT venta_predios_venta_id_fk
        FOREIGN KEY (venta_id) REFERENCES ventas(id) ON DELETE RESTRICT;
    `)

    // --- notificaciones_cobros.venta_id: CASCADE → RESTRICT ---
    await this.db.rawQuery(`
      DO $$
      DECLARE
        r RECORD;
      BEGIN
        FOR r IN
          SELECT tc.constraint_name
          FROM information_schema.table_constraints tc
          JOIN information_schema.referential_constraints rc
            ON tc.constraint_name = rc.constraint_name AND tc.constraint_schema = rc.constraint_schema
          JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
          WHERE tc.table_name = 'notificaciones_cobros'
            AND kcu.column_name = 'venta_id'
            AND tc.constraint_type = 'FOREIGN KEY'
            AND rc.delete_rule = 'CASCADE'
        LOOP
          EXECUTE 'ALTER TABLE notificaciones_cobros DROP CONSTRAINT IF EXISTS ' || quote_ident(r.constraint_name);
        END LOOP;
      END $$;
    `)
    await this.db.rawQuery(`
      ALTER TABLE notificaciones_cobros
        ADD CONSTRAINT notificaciones_cobros_venta_id_fk
        FOREIGN KEY (venta_id) REFERENCES ventas(id) ON DELETE RESTRICT;
    `)
  }

  public async down() {
    // Restaurar CASCADEs (solo para entornos de desarrollo/pruebas)
    await this.db.rawQuery(`
      ALTER TABLE ventas DROP CONSTRAINT IF EXISTS ventas_cliente_id_fk;
      ALTER TABLE ventas ADD CONSTRAINT ventas_cliente_id_fk_cascade
        FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE;

      ALTER TABLE pagos DROP CONSTRAINT IF EXISTS pagos_venta_id_fk;
      ALTER TABLE pagos ADD CONSTRAINT pagos_venta_id_fk_cascade
        FOREIGN KEY (venta_id) REFERENCES ventas(id) ON DELETE CASCADE;

      ALTER TABLE programaciones_pago DROP CONSTRAINT IF EXISTS programaciones_pago_venta_id_fk;
      ALTER TABLE programaciones_pago ADD CONSTRAINT programaciones_pago_venta_id_fk_cascade
        FOREIGN KEY (venta_id) REFERENCES ventas(id) ON DELETE CASCADE;

      ALTER TABLE venta_predios DROP CONSTRAINT IF EXISTS venta_predios_venta_id_fk;
      ALTER TABLE venta_predios ADD CONSTRAINT venta_predios_venta_id_fk_cascade
        FOREIGN KEY (venta_id) REFERENCES ventas(id) ON DELETE CASCADE;

      ALTER TABLE notificaciones_cobros DROP CONSTRAINT IF EXISTS notificaciones_cobros_venta_id_fk;
      ALTER TABLE notificaciones_cobros ADD CONSTRAINT notificaciones_cobros_venta_id_fk_cascade
        FOREIGN KEY (venta_id) REFERENCES ventas(id) ON DELETE CASCADE;
    `)
  }
}
