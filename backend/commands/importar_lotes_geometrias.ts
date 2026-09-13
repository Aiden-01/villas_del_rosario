import { BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { importarGeometriasLotesDesdeArchivo } from '#services/importar_lotes_geometrias_service'

export default class ImportarLotesGeometrias extends BaseCommand {
  static commandName = 'lotes:importar-geometrias'
  static description = 'Valida e importa las geometrías GeoJSON de los lotes existentes'

  static options: CommandOptions = {
    startApp: true,
  }

  @flags.boolean({ description: 'Valida y muestra el resultado sin guardar geometrías' })
  declare dryRun: boolean

  async run() {
    const rutaArchivo = this.app.makePath('database/geo/lotes_villas_rosario.geojson')

    try {
      const resultado = await importarGeometriasLotesDesdeArchivo(rutaArchivo, {
        dryRun: this.dryRun,
      })

      this.logger.info('Lote | Código | Área sistema | Área fuente | Resultado')
      for (const fila of resultado.filas) {
        this.logger.info(
          `${fila.lote} | ${fila.codigo} | ${fila.areaSistema.toFixed(2)} m2 | ${fila.areaFuente.toFixed(2)} m2 | ${fila.resultado}`
        )
      }

      if (resultado.dryRun) {
        this.logger.success(
          `Dry-run correcto: ${resultado.total} lotes listos; no se guardaron filas.`
        )
      } else {
        this.logger.success(`Importación completada: ${resultado.total} geometrías guardadas.`)
      }
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : String(error)
      this.logger.error(`Importación abortada: ${mensaje}`)
      this.exitCode = 1
    }
  }
}
