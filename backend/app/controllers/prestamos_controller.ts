import type { HttpContext } from '@adonisjs/core/http'
import Prestamo from '#models/prestamo'
import ApiToken from '#models/api_token'

export default class PrestamosController {

  /**
   * Verificar token manualmente
   */
  private async verifyToken(token: string) {
    if (!token) return null

    const apiToken = await ApiToken.query()
      .where('token', token.replace('Bearer ', ''))
      .preload('user')
      .first()

    return apiToken?.user || null
  }

  /**
   * Listar todos los préstamos
   */
  async index({ request, response }: HttpContext) {
    try {
      const authHeader = request.header('authorization')
      const user = await this.verifyToken(authHeader || '')

      if (!user) {
        return response.forbidden({ message: 'No autorizado' })
      }

      const prestamos = await Prestamo.query().preload('cliente')
      return response.ok(prestamos)

    } catch (error) {
      console.error(error)
      return response.internalServerError({ message: 'Error al obtener préstamos' })
    }
  }

  /**
   * Obtener préstamo por ID
   */
  async show({ request, params, response }: HttpContext) {
    try {
      const authHeader = request.header('authorization')
      const user = await this.verifyToken(authHeader || '')

      if (!user) {
        return response.forbidden({ message: 'No autorizado' })
      }

      const prestamo = await Prestamo.query()
        .where('id', params.id)
        .preload('cliente')
        .first()

      if (!prestamo) {
        return response.notFound({ message: 'Préstamo no encontrado' })
      }

      return response.ok(prestamo)

    } catch (error) {
      console.error(error)
      return response.internalServerError({ message: 'Error al obtener préstamo' })
    }
  }

  /**
   * Obtener préstamos de un cliente específico
   */
  async byCliente({ request, params, response }: HttpContext) {
    try {
      const authHeader = request.header('authorization')
      const user = await this.verifyToken(authHeader || '')

      if (!user) {
        return response.forbidden({ message: 'No autorizado' })
      }

      const prestamos = await Prestamo.query()
        .where('cliente_id', params.clienteId)
        .preload('cliente')

      return response.ok(prestamos)

    } catch (error) {
      console.error(error)
      return response.internalServerError({ message: 'Error al obtener préstamos del cliente' })
    }
  }

  /**
   * Crear préstamo
   */
  async store({ request, response }: HttpContext) {
    try {
      const authHeader = request.header('authorization')
      const user = await this.verifyToken(authHeader || '')

      if (!user) {
        return response.forbidden({ message: 'No autorizado' })
      }

      const data = request.only([
        'clienteId',
        'monto',
        'interes',
        'cuotas',
        'fechaInicio',
        'fechaFin',
        'estado'
      ])

      if (!data.clienteId || !data.monto || !data.interes || !data.cuotas || !data.fechaInicio || !data.fechaFin) {
        return response.badRequest({ message: 'Todos los campos son obligatorios' })
      }

      const prestamo = await Prestamo.create(data)
      await prestamo.load('cliente')

      return response.created({
        message: 'Préstamo creado exitosamente',
        prestamo
      })

    } catch (error) {
      console.error(error)
      return response.internalServerError({ message: 'Error al crear préstamo' })
    }
  }

  /**
   * Actualizar préstamo
   */
  async update({ request, params, response }: HttpContext) {
    try {
      const authHeader = request.header('authorization')
      const user = await this.verifyToken(authHeader || '')

      if (!user) {
        return response.forbidden({ message: 'No autorizado' })
      }

      const prestamo = await Prestamo.findOrFail(params.id)

      const data = request.only([
        'monto',
        'interes',
        'cuotas',
        'fechaInicio',
        'fechaFin',
        'estado'
      ])

      prestamo.merge(data)
      await prestamo.save()
      await prestamo.load('cliente')

      return response.ok({
        message: 'Préstamo actualizado exitosamente',
        prestamo
      })

    } catch (error) {
      console.error(error)
      return response.internalServerError({ message: 'Error al actualizar préstamo' })
    }
  }

  /**
   * Eliminar préstamo (solo admin)
   */
  async destroy({ request, params, response }: HttpContext) {
    try {
      const authHeader = request.header('authorization')
      const user = await this.verifyToken(authHeader || '')

      if (!user) {
        return response.forbidden({ message: 'No autorizado' })
      }

      if (user.role !== 'admin') {
        return response.forbidden({ message: 'Solo el administrador puede eliminar préstamos' })
      }

      const prestamo = await Prestamo.findOrFail(params.id)
      await prestamo.delete()

      return response.ok({ message: 'Préstamo eliminado exitosamente' })

    } catch (error) {
      console.error(error)
      return response.internalServerError({ message: 'Error al eliminar préstamo' })
    }
  }
}