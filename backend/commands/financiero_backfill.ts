import { verificarPermisoBackfill } from '#services/local_financiero_guard'
import { BaseCommand, flags } from '@adonisjs/core/ace'
import { CommandOptions } from '@adonisjs/core/types/ace'
import { reconstruirAplicacionesTodasLasVentas } from '#services/reconstruir_aplicaciones_service'

export default class FinancieroBackfill extends BaseCommand {
  static commandName = 'financiero:backfill'
  static description =
    'Reconstruye deterministicamente las aplicaciones de pago para todas las ventas'

  static options: CommandOptions = {
    startApp: true,
  }

  @flags.boolean({
    description: 'Confirma explicitamente la ejecucion cuando NODE_ENV=production',
  })
  declare confirmProduction: boolean

  async run() {
    this.logger.info(JSON.stringify(verificarPermisoBackfill(this.confirmProduction)))
    this.logger.info('Iniciando reconstruccion de aplicaciones de pago...')
    this.logger.info('NOTA: Este comando NO modifica los pagos originales.')
    this.logger.info('Solo reconstruye la tabla derivada pago_aplicaciones.')
    this.logger.info('')

    const resultado = await reconstruirAplicacionesTodasLasVentas()

    this.logger.info(`Ventas procesadas: ${resultado.total}`)
    this.logger.success(`Ventas exitosas: ${resultado.exitosas}`)

    if (resultado.fallidas > 0 || resultado.anomalias.length > 0) this.exitCode = 1
    if (resultado.fallidas > 0) {
      this.logger.error(`Ventas con error: ${resultado.fallidas}`)
    }

    if (resultado.anomalias.length > 0) {
      this.logger.warning(`Anomalias detectadas: ${resultado.anomalias.length}`)
      for (const anomalia of resultado.anomalias) {
        this.logger.warning(`  - ${anomalia}`)
      }
    } else {
      this.logger.success('Sin anomalias detectadas.')
    }

    this.logger.info('')
    this.logger.info('Backfill completado.')
  }
}
