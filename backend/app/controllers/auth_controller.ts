// app/controllers/auth_controller.ts
import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'
import Hash from '@adonisjs/core/services/hash'
import { randomUUID } from 'node:crypto'

export default class AuthController {
  public async login({ request, response }: HttpContext) {
    const { username, password } = request.only(['username', 'password'])

    try {
      // 1. Buscar usuario
      const user = await User.findBy('username', username)
      
      if (!user) {
        return response.unauthorized({ 
          message: 'Credenciales incorrectas' 
        })
      }
      
      // 2. Verificar contraseña
      const isValid = await Hash.verify(user.password, password)
      
      if (!isValid) {
        return response.unauthorized({ 
          message: 'Credenciales incorrectas' 
        })
      }
      
      // 3. Generar token simple (sin usar auth.use)
      const tokenValue = randomUUID().replace(/-/g, '')
      
      // Crear el token directamente
      const token = await user.related('apiTokens').create({
        type: 'api',
        token: tokenValue,
        expiresAt: null,
      })
      
      return {
        type: 'bearer',
        token: token.token,
        user: {
          id: user.id,
          name: user.name,
          username: user.username,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt,
        }
      }
    } catch (error) {
      console.error('Login error:', error)
      return response.unauthorized({ 
        message: 'Error en el servidor' 
      })
    }
  }
}