import { BaseSeeder } from '@adonisjs/lucid/seeders'
import User from '#models/user'

export default class extends BaseSeeder {
  async run() {
    await User.create({
      name: 'Administrador',
      email: 'admin@gmail.c.com',
      username: 'admin',
      password: '123456',
      role: 'admin',
    })
    await User.create({
      name: 'Chambeador',
      email: 'trabaja@trabajador.com',
      username: 'trabajador',
      password: '12345',
      role: 'trabajador',
    })
  }
}
