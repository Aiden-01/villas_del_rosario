import { BaseSeeder } from '@adonisjs/lucid/seeders'
import User from '#models/user'

export default class AdminSeeder extends BaseSeeder {
  async run() {
    await User.updateOrCreate(
      { username: 'admin' },
      {
        name: 'Administrador',
        username: 'admin',
        email: 'hercor.nexus@gmail.com',
        password: 'Admin123',
        role: 'admin',
      }
    )
    console.log('Usuario admin creado')
  }
}