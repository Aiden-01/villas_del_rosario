import { BaseCommand } from '@adonisjs/core/ace'
import { CommandOptions } from '@adonisjs/core/types/ace'
import { marcarVencidos } from '../app/jobs/Marcar_Vencidos_job.js'

export default class MarcarVencidosCommand extends BaseCommand {
  static commandName = 'prestamos:marcar-vencidos'
  static description = 'Marca como vencidos los préstamos activos cuya fecha fin ya pasó'

  static options: CommandOptions = {
    startApp: true,  // ✅ Esto inicializa Lucid y la DB antes de correr
  }

  async run() {
    this.logger.info('Iniciando proceso de préstamos vencidos...')
    const count = await marcarVencidos()
    this.logger.success(`${count} préstamos marcados como vencidos`)
  }
}
