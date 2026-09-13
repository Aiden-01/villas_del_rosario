import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'lote_geometrias'

  public async up() {
    this.schema.raw('CREATE EXTENSION IF NOT EXISTS postgis')

    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table
        .integer('lote_id')
        .unsigned()
        .notNullable()
        .unique()
        .references('id')
        .inTable('lotes')
        .onDelete('RESTRICT')
      table.string('codigo').notNullable().unique()
      table.decimal('area_fuente', 12, 2).nullable()
      table.specificType('geom', 'geometry(Polygon,4326)').notNullable()
      table.timestamp('created_at')
      table.timestamp('updated_at')
    })

    this.schema.raw('CREATE INDEX lote_geometrias_geom_gist ON lote_geometrias USING GIST (geom)')
  }

  public async down() {
    this.schema.dropTableIfExists(this.tableName)
    // PostGIS puede ser compartido o anterior a esta migracion; el rollback no debe eliminarlo.
  }
}
