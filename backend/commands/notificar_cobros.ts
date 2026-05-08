import { BaseCommand } from '@adonisjs/core/ace'
import { CommandOptions } from '@adonisjs/core/types/ace'
import { notificarCobrosDelDia } from '../app/services/notificaciones_cobros_service.js'

export default class NotificarCobrosCommand extends BaseCommand {
  static commandName = 'cobros:notificar'
  static description = 'Envia un correo resumen con los cobros pactados para el dia'

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    let completed = false
    process.once('uncaughtException', (error) => {
      if (completed && error.message === 'Connection terminated') {
        process.exit(0)
      }

      throw error
    })

    const fecha = process.env.COBROS_NOTIFICACIONES_FECHA
    const resultado = await notificarCobrosDelDia(fecha)

    if (resultado.dryRun) {
      this.logger.info(
        `[dry-run] ${resultado.encontrados} cobros encontrados para ${resultado.fecha}. No se envio correo ni se guardo historial.`
      )
      completed = true
      return
    }

    if (resultado.enviados === 0) {
      this.logger.info(
        `No hay cobros nuevos por notificar para ${resultado.fecha}. Omitidos: ${resultado.omitidos}`
      )
      completed = true
      return
    }

    this.logger.success(
      `Correo enviado con ${resultado.enviados} cobros para ${resultado.fecha}. Omitidos por historial: ${resultado.omitidos}`
    )
    completed = true
  }
}
