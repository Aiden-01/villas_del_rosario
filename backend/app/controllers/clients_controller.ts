import type { HttpContext } from '@adonisjs/core/http'
import Client from '#models/client'
import Prestamo from '#models/prestamo'
import ApiToken from '#models/api_token'
import { registrarActividad } from '../helpers/registrar_actividad.js'
import { clientValidator } from '#validators/clients_validator'
import { cleanEmptyStrings, isValidationError, validationMessages } from '#validators/helpers'
import { DateTime } from 'luxon'

const TZ = 'America/Guatemala'
const EPSILON = 0.01

export default class ClientsController {
  private async verifyToken(token: string) {
    if (!token) return null
    const apiToken = await ApiToken.query()
      .where('token', token.replace('Bearer ', ''))
      .preload('user')
      .first()
    return apiToken?.user || null
  }

  async index({ request, response }: HttpContext) {
    try {
      const authHeader = request.header('authorization')
      const user = await this.verifyToken(authHeader || '')
      if (!user) return response.forbidden({ message: 'No autorizado' })

      const clients = await Client.query().orderBy('nombres', 'asc').orderBy('apellidos', 'asc')
      return response.ok(clients)
    } catch (error) {
      console.error(error)
      return response.internalServerError({ message: 'Error al obtener clientes' })
    }
  }

  async store({ request, response }: HttpContext) {
    try {
      const authHeader = request.header('authorization')
      const user = await this.verifyToken(authHeader || '')
      if (!user) return response.forbidden({ message: 'No autorizado' })

      const data = await clientValidator.validate(cleanEmptyStrings(request.all(), ['zona']))

      const newClient = await Client.create(data)

      await registrarActividad({
        usuarioId: user.id,
        tipo: 'crear',
        entidad: 'cliente',
        entidadId: newClient.id,
        descripcion: `Creo el cliente ${newClient.nombres} ${newClient.apellidos}`,
        detalle: { telefono: newClient.telefono, direccion: newClient.direccion },
      })

      return response.created({ message: 'Cliente creado exitosamente', client: newClient })
    } catch (error) {
      if (isValidationError(error)) {
        return response.badRequest({
          message: 'Datos invalidos para crear cliente',
          errors: validationMessages(error),
        })
      }

      console.error(error)
      return response.internalServerError({ message: 'Error al crear cliente' })
    }
  }

  async update({ request, params, response }: HttpContext) {
    try {
      const authHeader = request.header('authorization')
      const user = await this.verifyToken(authHeader || '')
      if (!user) return response.forbidden({ message: 'No autorizado' })

      const client = await Client.findOrFail(params.id)
      const data = await clientValidator.validate(cleanEmptyStrings(request.all(), ['zona']))

      client.merge(data)
      await client.save()

      await registrarActividad({
        usuarioId: user.id,
        tipo: 'actualizar',
        entidad: 'cliente',
        entidadId: client.id,
        descripcion: `Actualizo el cliente ${client.nombres} ${client.apellidos}`,
      })

      return response.ok({ message: 'Cliente actualizado exitosamente', client })
    } catch (error) {
      if (isValidationError(error)) {
        return response.badRequest({
          message: 'Datos invalidos para actualizar cliente',
          errors: validationMessages(error),
        })
      }

      console.error(error)
      return response.internalServerError({ message: 'Error al actualizar cliente' })
    }
  }

  async destroy({ request, params, response }: HttpContext) {
    try {
      const authHeader = request.header('authorization')
      const user = await this.verifyToken(authHeader || '')
      if (!user) return response.forbidden({ message: 'No autorizado' })

      if (user.role !== 'admin') {
        return response.forbidden({ message: 'Solo el administrador puede eliminar clientes' })
      }

      const client = await Client.findOrFail(params.id)
      const nombre = `${client.nombres} ${client.apellidos}`
      await client.delete()

      await registrarActividad({
        usuarioId: user.id,
        tipo: 'eliminar',
        entidad: 'cliente',
        entidadId: Number(params.id),
        descripcion: `Elimino el cliente ${nombre}`,
      })

      return response.ok({ message: 'Cliente eliminado exitosamente' })
    } catch (error) {
      console.error(error)
      return response.internalServerError({ message: 'Error al eliminar cliente' })
    }
  }

  async show({ request, params, response }: HttpContext) {
    try {
      const authHeader = request.header('authorization')
      const user = await this.verifyToken(authHeader || '')
      if (!user) return response.forbidden({ message: 'No autorizado' })

      const client = await Client.query().where('id', params.id).first()

      if (!client) return response.notFound({ message: 'Cliente no encontrado' })
      return response.ok(client)
    } catch (error) {
      console.error(error)
      return response.internalServerError({ message: 'Error al obtener cliente' })
    }
  }

  async estadoCuenta({ request, params, response }: HttpContext) {
    try {
      const authHeader = request.header('authorization')
      const user = await this.verifyToken(authHeader || '')
      if (!user) return response.forbidden({ message: 'No autorizado' })

      const client = await Client.findOrFail(params.id)
      const ventas = await Prestamo.query()
        .where('cliente_id', params.id)
        .preload('lote')
        .preload('pagos', (query) =>
          query.orderBy('fecha_pago', 'asc').orderBy('created_at', 'asc')
        )

      const hoy = DateTime.now().setZone(TZ).startOf('day')

      const detalleVentas = ventas.map((venta) => {
        const cuotaMonto = Number((Number(venta.monto) / Number(venta.cuotas || 1)).toFixed(2))
        const totalPagado = Number(
          (venta.pagos || [])
            .reduce((suma, pago) => suma + Number(pago.montoPagado || 0), 0)
            .toFixed(2)
        )
        const saldoPendiente = Number(Math.max(Number(venta.monto) - totalPagado, 0).toFixed(2))
        const pagosPorCuota = new Map<number, number>()

        for (const pago of venta.pagos || []) {
          if (pago.numeroCuota <= 0 || (pago.tipoPago && pago.tipoPago !== 'cuota')) continue
          const actual = pagosPorCuota.get(pago.numeroCuota) || 0
          pagosPorCuota.set(
            pago.numeroCuota,
            Number((actual + Number(pago.montoPagado)).toFixed(2))
          )
        }

        const cuotas = []
        let cuotasPagadas = 0
        let cuotasPendientes = 0
        let cuotasEnMora = 0
        const baseCobro = venta.fechaCobro || venta.fechaInicio

        for (let numero = 1; numero <= Number(venta.cuotas || 0); numero++) {
          const pagado = pagosPorCuota.get(numero) || 0
          const pendiente = Number(Math.max(cuotaMonto - pagado, 0).toFixed(2))
          const fechaProgramada = baseCobro
            ? baseCobro.plus({ months: Math.max(numero - 1, 0) }).toISODate()
            : null
          const vencida =
            pendiente > EPSILON &&
            Boolean(fechaProgramada) &&
            DateTime.fromISO(fechaProgramada!, { zone: TZ }) < hoy

          if (pendiente <= EPSILON) cuotasPagadas++
          else cuotasPendientes++
          if (vencida) cuotasEnMora++

          cuotas.push({
            numero,
            monto: cuotaMonto,
            pagado,
            pendiente,
            fechaProgramada,
            estado: pendiente <= EPSILON ? 'pagada' : vencida ? 'mora' : 'pendiente',
          })
        }

        return {
          id: venta.id,
          lote: venta.numeroLote || 'N/A',
          medidaLote: venta.medidaLote,
          areaLote: venta.areaLote,
          estado: venta.estado,
          precio: Number(venta.monto),
          totalPagado,
          saldoPendiente,
          cuotaMonto,
          cuotasPagadas,
          cuotasPendientes,
          cuotasEnMora,
          totalCuotas: Number(venta.cuotas || 0),
          fechaInicio: venta.fechaInicio?.toISODate(),
          fechaFin: venta.fechaFin?.toISODate(),
          fechaCobro: venta.fechaCobro?.toISODate() || null,
          cuotas,
          pagos: (venta.pagos || []).map((pago) => ({
            id: pago.id,
            numeroCuota: pago.numeroCuota,
            tipoPago: pago.tipoPago,
            montoPagado: Number(pago.montoPagado),
            fechaPago: pago.fechaPago?.toISODate(),
          })),
        }
      })

      const resumen = detalleVentas.reduce(
        (totales, venta) => {
          totales.totalVentas += 1
          totales.totalVendido += venta.precio
          totales.totalPagado += venta.totalPagado
          totales.saldoPendiente += venta.saldoPendiente
          totales.cuotasEnMora += venta.cuotasEnMora
          return totales
        },
        {
          totalVentas: 0,
          totalVendido: 0,
          totalPagado: 0,
          saldoPendiente: 0,
          cuotasEnMora: 0,
        }
      )

      return response.ok({
        generadoEn: DateTime.now().setZone(TZ).toISO(),
        cliente: client,
        resumen: {
          ...resumen,
          totalVendido: Number(resumen.totalVendido.toFixed(2)),
          totalPagado: Number(resumen.totalPagado.toFixed(2)),
          saldoPendiente: Number(resumen.saldoPendiente.toFixed(2)),
        },
        ventas: detalleVentas,
      })
    } catch (error) {
      console.error(error)
      return response.internalServerError({ message: 'Error al generar estado de cuenta' })
    }
  }
}
