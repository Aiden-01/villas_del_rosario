import { BaseCommand } from '@adonisjs/core/ace'
import { CommandOptions } from '@adonisjs/core/types/ace'
import User from '#models/user'

export default class SeedAdminCommand extends BaseCommand {
  static commandName = 'app:seed-admin'
  static description = 'Crea o actualiza el usuario administrador por defecto'

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    const username = process.env.ADMIN_USERNAME || 'admin'
    const password = process.env.ADMIN_PASSWORD || 'admin123'
    const email = process.env.ADMIN_EMAIL || 'admin@villasdelrosario.local'
    const name = process.env.ADMIN_NAME || 'Administrador'

    const existingUser = await User.findBy('username', username)

    if (!existingUser) {
      await User.create({
        name,
        email,
        username,
        password,
        role: 'admin',
      })

      this.logger.success(`Usuario admin creado: ${username}`)
      return
    }

    existingUser.name = name
    existingUser.email = email
    existingUser.role = 'admin'
    existingUser.password = password
    await existingUser.save()

    this.logger.success(`Usuario admin actualizado: ${username}`)
  }
}
