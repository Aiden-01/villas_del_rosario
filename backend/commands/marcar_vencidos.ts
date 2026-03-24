/**
 * app/commands/marcar_vencidos.ts
 *
 * Comando que se registra en AdonisJS para correr el job de vencidos.
 * Crear con: node ace make:command MarcarVencidos
 * Luego reemplazar el contenido con este.
 */

import { BaseCommand } from '@adonisjs/core/ace'
import { marcarVencidos } from '../jobs/marcar_vencidos_job.js'

export default class MarcarVencidosCommand extends BaseCommand {
  static commandName = 'prestamos:marcar-vencidos'
  static description  = 'Marca como vencidos los préstamos activos cuya fecha fin ya pasó'

  async run() {
    this.logger.info('Iniciando proceso de préstamos vencidos...')
    const count = await marcarVencidos()
    this.logger.success(`${count} préstamos marcados como vencidos`)
  }
}