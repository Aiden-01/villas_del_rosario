import { BaseCommand } from '@adonisjs/core/ace'
import { CommandOptions } from '@adonisjs/core/types/ace'
import { marcarVencidos } from '../app/jobs/Marcar_Vencidos_job.js'

export default class MarcarVencidosCommand extends BaseCommand {
  static commandName = 'prestamos:marcar-vencidos'
  static description = 'Marca como vencidas las ventas activas cuya fecha fin ya pasó'

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    this.logger.info('Iniciando proceso de ventas vencidas...')
    const count = await marcarVencidos()
    this.logger.success(`${count} ventas marcadas como vencidas`)
  }
}
