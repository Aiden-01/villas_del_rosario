import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import Pago from '#models/pago'
import Prestamo from '#models/prestamo'
import ApiToken from '#models/api_token'
import ProgramacionPago from '#models/programacion_pago'
import { registrarActividad } from '../helpers/registrar_actividad.js'
import { aplicarAbonoAVenta } from '../services/abonos_ventas_service.js'
import {
  abonoValidator,
  createPagoValidator,
  programacionPagoValidator,
} from '#validators/pagos_validator'
import { cleanEmptyStrings, isValidationError, validationMessages } from '#validators/helpers'

const TZ = 'America/Guatemala'
const EPSILON = 0.01

type PagoLike = {
  numeroCuota: number
  montoPagado: number
  fechaPago: any
  tipoPago?: string | null
}

export default class PagosController {
  private async verifyToken(token: string) {
    if (!token) return null
    const apiToken = await ApiToken.query()
      .where('token', token.replace('Bearer ', ''))
      .preload('user')
      .first()
    return apiToken?.user || null
  }

  private cuotaMonto(venta: Prestamo) {
    return Number((Number(venta.monto) / Number(venta.cuotas || 1)).toFixed(2))
  }

  private agruparPagos(pagos: PagoLike[]) {
    const resumen = new Map<number, number>()
    for (const pago of pagos) {
      if (pago.numeroCuota <= 0 || (pago.tipoPago && pago.tipoPago !== 'cuota')) continue

      const actual = resumen.get(pago.numeroCuota) || 0
      resumen.set(pago.numeroCuota, Number((actual + Number(pago.montoPagado)).toFixed(2)))
    }
    return resumen
  }

  private resumenCuotas(venta: Prestamo) {
    const cuotaMonto = this.cuotaMonto(venta)
    const pagosPorCuota = this.agruparPagos((venta.pagos || []) as PagoLike[])
    const totalPagado = Number(
      ((venta.pagos || []) as PagoLike[])
        .reduce((sum, current) => sum + Number(current.montoPagado), 0)
        .toFixed(2)
    )
    const saldoPendiente = Number(Math.max(Number(venta.monto) - totalPagado, 0).toFixed(2))

    let cuotasPagadas = 0
    let proximaCuota: number | null = null
    let montoPendienteCuota = 0

    for (let cuota = 1; cuota <= Number(venta.cuotas || 0); cuota++) {
      const pagado = pagosPorCuota.get(cuota) || 0
      if (pagado + EPSILON >= cuotaMonto) {
        cuotasPagadas++
        continue
      }

      proximaCuota = cuota
      montoPendienteCuota = Number(Math.min(cuotaMonto - pagado, saldoPendiente).toFixed(2))
      break
    }

    if (saldoPendiente <= EPSILON) {
      proximaCuota = null
      montoPendienteCuota = 0
    } else if (!proximaCuota && Number(venta.cuotas || 0) > 0) {
      proximaCuota = Number(venta.cuotas)
      montoPendienteCuota = saldoPendiente
    }

    return {
      cuotaMonto,
      cuotasPagadas,
      proximaCuota,
      montoPendienteCuota,
      pagosPorCuota,
      totalPagado,
      saldoPendiente,
    }
  }

  private fechaIso(fecha: any) {
    try {
      if (!fecha) return null
      if (typeof fecha.toISODate === 'function') return fecha.toISODate()
      return DateTime.fromJSDate(new Date(fecha)).setZone(TZ).toISODate()
    } catch {
      return null
    }
  }

  private fechaProgramadaVenta(venta: Prestamo, numeroCuota: number) {
    const base = venta.fechaCobro || venta.fechaInicio
    if (!base) return null

    let dt: DateTime
    if (typeof (base as any).plus === 'function') {
      const baseDate = base as DateTime
      dt = DateTime.fromObject(
        {
          year: baseDate.year,
          month: baseDate.month,
          day: baseDate.day,
        },
        { zone: TZ }
      )
    } else {
      dt = DateTime.fromISO(String(base), { zone: TZ })
    }

    return dt.plus({ months: Math.max(numeroCuota - 1, 0) }).toISODate()
  }

  private voucherPago(params: {
    venta: Prestamo
    pagoId?: number
    tipo: 'cuota' | 'abono' | 'enganche' | 'pago_parcial'
    montoPagado: number
    fechaPago: string | null
    numeroCuota?: number | null
    pendienteCuotaRestante?: number | null
    resumen: ReturnType<PagosController['resumenCuotas']>
    nota?: string | null
    fechaProgramada?: string | null
  }) {
    const cliente = params.venta.cliente

    return {
      id: params.pagoId || null,
      generadoEn: DateTime.now().setZone(TZ).toISO(),
      tipo: params.tipo,
      montoPagado: Number(params.montoPagado || 0),
      fechaPago: params.fechaPago,
      numeroCuota: params.numeroCuota || null,
      nota: params.nota || null,
      fechaProgramada: params.fechaProgramada || null,
      cliente: {
        nombres: cliente.nombres,
        apellidos: cliente.apellidos,
        telefono: cliente.telefono,
        direccion: cliente.direccion,
        zona: cliente.zona,
      },
      venta: {
        id: params.venta.id,
        lote: params.venta.numeroLote || 'N/A',
        precio: Number(params.venta.monto),
        cuotas: Number(params.venta.cuotas || 0),
        cuotaMonto: params.resumen.cuotaMonto,
        cuotasPagadas: params.resumen.cuotasPagadas,
        saldoRestante: params.resumen.saldoPendiente,
        proximaCuota: params.resumen.proximaCuota,
        pendienteCuotaActual:
          params.pendienteCuotaRestante === undefined
            ? params.resumen.montoPendienteCuota
            : params.pendienteCuotaRestante,
        estado: params.venta.estado,
      },
    }
  }

  private async resolverProgramaciones(ventaId: number, numeroCuota: number) {
    const abiertas = await ProgramacionPago.query()
      .where('venta_id', ventaId)
      .where('numero_cuota', numeroCuota)
      .where('resuelto', false)

    for (const programacion of abiertas) {
      programacion.resuelto = true
      await programacion.save()
    }
  }

  private construirPendiente(venta: Prestamo) {
    const resumen = this.resumenCuotas(venta)
    if (!resumen.proximaCuota) return null

    const abierta = (venta.programaciones || [])
      .filter((item) => !item.resuelto && item.numeroCuota === resumen.proximaCuota)
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))[0]

    const fechaPactada = this.fechaProgramadaVenta(venta, resumen.proximaCuota)
    const fechaProgramada = abierta ? this.fechaIso(abierta.fechaProgramada) : fechaPactada

    return {
      prestamoId: venta.id,
      cliente: {
        id: venta.cliente.id,
        nombres: venta.cliente.nombres,
        apellidos: venta.cliente.apellidos,
        telefono: venta.cliente.telefono,
        direccion: venta.cliente.direccion,
        zona: venta.cliente.zona,
      },
      numeroLote: venta.numeroLote,
      montoCuota: resumen.cuotaMonto,
      montoPendienteCuota: resumen.montoPendienteCuota,
      proximaCuota: resumen.proximaCuota,
      cuotasPagadas: resumen.cuotasPagadas,
      totalCuotas: venta.cuotas,
      esReprogramado: Boolean(abierta),
      notaReprogramacion: abierta?.nota || null,
      tipoGestion: abierta?.tipoGestion || null,
      fechaPactada,
      fechaProgramada,
    }
  }

  async index({ request, response }: HttpContext) {
    try {
      const authHeader = request.header('authorization')
      const user = await this.verifyToken(authHeader || '')
      if (!user) return response.forbidden({ message: 'No autorizado' })

      const pagos = await Pago.query()
        .preload('prestamo', (q) => q.preload('cliente').preload('lote'))
        .preload('usuario')
      return response.ok(pagos)
    } catch (error) {
      console.error(error)
      return response.internalServerError({ message: 'Error al obtener pagos' })
    }
  }

  async agenda({ request, response }: HttpContext) {
    try {
      const authHeader = request.header('authorization')
      const user = await this.verifyToken(authHeader || '')
      if (!user) return response.forbidden({ message: 'No autorizado' })

      const fecha = request.input('fecha') || DateTime.now().setZone(TZ).toISODate()
      const ventas = await Prestamo.query()
        .whereIn('estado', ['activo', 'vencido'])
        .preload('cliente')
        .preload('lote')
        .preload('pagos')
        .preload('programaciones')

      const programacionesDelDia = await ProgramacionPago.query()
        .whereRaw(`DATE(created_at AT TIME ZONE '${TZ}') = ?`, [fecha])
        .preload('prestamo', (q) => q.preload('cliente').preload('lote').preload('pagos'))

      const pagosDelDia = await Pago.query()
        .where('fecha_pago', fecha)
        .where('tipo_pago', 'cuota')
        .where('numero_cuota', '>', 0)
        .preload('prestamo', (q) => q.preload('cliente').preload('lote').preload('pagos'))

      const gestionadosKeys = new Set(
        programacionesDelDia.map(
          (programacion) => `${programacion.prestamoId}-${programacion.numeroCuota}`
        )
      )

      const pendientes: any[] = []

      for (const venta of ventas) {
        const pendiente = this.construirPendiente(venta)
        if (!pendiente) continue
        if (pendiente.fechaProgramada !== fecha) continue
        if (gestionadosKeys.has(`${venta.id}-${pendiente.proximaCuota}`)) continue

        pendientes.push(pendiente)
      }

      const cobradosAgrupados = new Map<number, any>()
      for (const pago of pagosDelDia) {
        if (gestionadosKeys.has(`${pago.prestamoId}-${pago.numeroCuota}`)) continue

        const venta = pago.prestamo
        const current = cobradosAgrupados.get(venta.id) || {
          prestamoId: venta.id,
          cliente: {
            id: venta.cliente.id,
            nombres: venta.cliente.nombres,
            apellidos: venta.cliente.apellidos,
            telefono: venta.cliente.telefono,
            direccion: venta.cliente.direccion,
            zona: venta.cliente.zona,
          },
          numeroLote: venta.numeroLote,
          totalPagadoHoy: 0,
          cuotasAfectadas: new Set<number>(),
        }

        current.totalPagadoHoy = Number(
          (current.totalPagadoHoy + Number(pago.montoPagado)).toFixed(2)
        )
        current.cuotasAfectadas.add(pago.numeroCuota)
        cobradosAgrupados.set(venta.id, current)
      }

      const cobrados = [...cobradosAgrupados.values()].map((item) => ({
        ...item,
        cuotasAfectadas: [...item.cuotasAfectadas].sort((a, b) => a - b),
      }))

      const gestionados = programacionesDelDia.map((programacion) => {
        const venta = programacion.prestamo
        const resumen = this.resumenCuotas(venta)
        return {
          prestamoId: venta.id,
          seguimientoId: programacion.id,
          tipo: programacion.tipoGestion,
          numeroCuota: programacion.numeroCuota,
          montoPagado: Number(programacion.montoRecibido),
          nota: programacion.nota,
          fechaProgramada: this.fechaIso(programacion.fechaProgramada),
          cliente: {
            id: venta.cliente.id,
            nombres: venta.cliente.nombres,
            apellidos: venta.cliente.apellidos,
            telefono: venta.cliente.telefono,
            direccion: venta.cliente.direccion,
            zona: venta.cliente.zona,
          },
          numeroLote: venta.numeroLote,
          montoCuota: resumen.cuotaMonto,
          montoPendienteCuota: resumen.montoPendienteCuota,
        }
      })

      return response.ok({
        fecha,
        totalPendientes: pendientes.length,
        totalCobrados: cobrados.length,
        totalGestionados: gestionados.length,
        totalRecaudado: Number(
          cobrados.reduce((sum, current) => sum + Number(current.totalPagadoHoy), 0).toFixed(2)
        ),
        pendientes,
        cobrados,
        gestionados,
      })
    } catch (error) {
      console.error(error)
      return response.internalServerError({ message: 'Error al obtener agenda de pagos' })
    }
  }

  async calendario({ request, response }: HttpContext) {
    try {
      const authHeader = request.header('authorization')
      const user = await this.verifyToken(authHeader || '')
      if (!user) return response.forbidden({ message: 'No autorizado' })

      const mesInput = request.input('mes') || DateTime.now().setZone(TZ).toFormat('yyyy-MM')
      const inicioMes = DateTime.fromFormat(String(mesInput), 'yyyy-MM', { zone: TZ }).startOf(
        'month'
      )

      if (!inicioMes.isValid) {
        return response.badRequest({ message: 'Mes invalido' })
      }

      const finMes = inicioMes.endOf('month')
      const hoy = DateTime.now().setZone(TZ).toISODate() || ''

      const ventas = await Prestamo.query()
        .whereIn('estado', ['activo', 'vencido'])
        .preload('cliente')
        .preload('lote')
        .preload('pagos')
        .preload('programaciones')

      const pendientesMes: any[] = []
      for (const venta of ventas) {
        const pendiente = this.construirPendiente(venta)
        if (!pendiente?.fechaProgramada) continue

        const fechaPendiente = DateTime.fromISO(pendiente.fechaProgramada, { zone: TZ })
        if (!fechaPendiente.isValid) continue
        if (fechaPendiente < inicioMes || fechaPendiente > finMes) continue

        pendientesMes.push({
          ...pendiente,
          esHoy: pendiente.fechaProgramada === hoy,
          estaVencido: pendiente.fechaProgramada < hoy,
          vencePronto: pendiente.fechaProgramada > hoy,
        })
      }

      pendientesMes.sort((a, b) => {
        const fecha = String(a.fechaProgramada).localeCompare(String(b.fechaProgramada))
        if (fecha !== 0) return fecha
        return String(a.cliente.nombres).localeCompare(String(b.cliente.nombres))
      })

      const gruposMap = new Map<string, any[]>()
      for (const item of pendientesMes) {
        const current = gruposMap.get(item.fechaProgramada) || []
        current.push(item)
        gruposMap.set(item.fechaProgramada, current)
      }

      const grupos = [...gruposMap.entries()].map(([fecha, items]) => ({
        fecha,
        total: items.length,
        items,
      }))

      return response.ok({
        mes: inicioMes.toFormat('yyyy-MM'),
        mesLabel: inicioMes.setLocale('es').toFormat('LLLL yyyy'),
        hoy,
        totalPendientes: pendientesMes.length,
        totalReprogramados: pendientesMes.filter((item) => item.esReprogramado).length,
        totalHoy: pendientesMes.filter((item) => item.esHoy).length,
        grupos,
      })
    } catch (error) {
      console.error(error)
      return response.internalServerError({ message: 'Error al obtener calendario de pagos' })
    }
  }

  async byPrestamo({ request, params, response }: HttpContext) {
    try {
      const authHeader = request.header('authorization')
      const user = await this.verifyToken(authHeader || '')
      if (!user) return response.forbidden({ message: 'No autorizado' })

      const pagos = await Pago.query()
        .where('venta_id', params.prestamoId)
        .preload('prestamo', (q) => q.preload('cliente').preload('lote'))
        .preload('usuario')
        .orderBy('numero_cuota', 'asc')
        .orderBy('created_at', 'asc')
      return response.ok(pagos)
    } catch (error) {
      console.error(error)
      return response.internalServerError({ message: 'Error al obtener pagos de la venta' })
    }
  }

  async store({ request, response }: HttpContext) {
    try {
      const authHeader = request.header('authorization')
      const user = await this.verifyToken(authHeader || '')
      if (!user) return response.forbidden({ message: 'No autorizado' })

      const data = await createPagoValidator.validate(request.all())
      const ventaId = data.ventaId || data.prestamoId

      if (!ventaId || !data.numeroCuota || !data.montoPagado || !data.fechaPago) {
        return response.badRequest({ message: 'Todos los campos son obligatorios' })
      }

      const prestamo = await Prestamo.query()
        .where('id', ventaId)
        .preload('cliente')
        .preload('lote')
        .preload('pagos')
        .firstOrFail()

      const resumenAntes = this.resumenCuotas(prestamo)
      if (!resumenAntes.proximaCuota) {
        return response.conflict({ message: 'La venta ya no tiene cuotas pendientes' })
      }

      if (Number(data.numeroCuota) !== resumenAntes.proximaCuota) {
        return response.conflict({
          message: `La cuota pendiente actual es la #${resumenAntes.proximaCuota}`,
        })
      }

      const monto = Number(data.montoPagado)
      if (monto <= 0) {
        return response.badRequest({ message: 'El monto del pago debe ser mayor a 0' })
      }

      if (monto - resumenAntes.montoPendienteCuota > EPSILON) {
        return response.badRequest({
          message: `El monto excede el pendiente de la cuota #${resumenAntes.proximaCuota}`,
        })
      }

      const pago = await Pago.create({
        prestamoId: ventaId,
        numeroCuota: data.numeroCuota,
        montoPagado: monto,
        fechaPago: DateTime.fromISO(data.fechaPago, { zone: TZ }),
        usuarioId: user.id,
        tipoPago: 'cuota',
      })
      await pago.load('prestamo', (q) => q.preload('cliente').preload('lote').preload('pagos'))
      await pago.load('usuario')

      const ventaActualizada = await Prestamo.query()
        .where('id', ventaId)
        .preload('pagos')
        .firstOrFail()
      const resumenDespues = this.resumenCuotas(ventaActualizada)

      if (resumenDespues.saldoPendiente <= EPSILON) {
        ventaActualizada.estado = 'pagado'
        await ventaActualizada.save()
      } else if (ventaActualizada.estado === 'pagado') {
        ventaActualizada.estado = 'activo'
        await ventaActualizada.save()
      }

      if (resumenDespues.montoPendienteCuota <= EPSILON) {
        await this.resolverProgramaciones(ventaId, Number(data.numeroCuota))
      }

      await ventaActualizada.load('cliente')
      await ventaActualizada.load('lote')

      await registrarActividad({
        usuarioId: user.id,
        tipo: 'pago',
        entidad: 'pago',
        entidadId: pago.id,
        descripcion: `Registro cuota #${pago.numeroCuota} de Q${pago.montoPagado} - lote ${pago.prestamo.numeroLote || 'N/A'} / ${pago.prestamo.cliente.nombres} ${pago.prestamo.cliente.apellidos}`,
        detalle: { numeroCuota: pago.numeroCuota, montoPagado: pago.montoPagado },
      })

      return response.created({
        message: 'Pago registrado exitosamente',
        pago,
        voucher: this.voucherPago({
          venta: ventaActualizada,
          pagoId: pago.id,
          tipo: 'cuota',
          montoPagado: monto,
          fechaPago: data.fechaPago,
          numeroCuota: data.numeroCuota,
          pendienteCuotaRestante: Number(
            Math.max(resumenAntes.montoPendienteCuota - monto, 0).toFixed(2)
          ),
          resumen: resumenDespues,
        }),
      })
    } catch (error) {
      if (isValidationError(error)) {
        return response.badRequest({
          message: 'Datos invalidos para registrar pago',
          errors: validationMessages(error),
        })
      }

      console.error(error)
      return response.internalServerError({ message: 'Error al registrar pago' })
    }
  }

  async abonar({ request, response }: HttpContext) {
    try {
      const authHeader = request.header('authorization')
      const user = await this.verifyToken(authHeader || '')
      if (!user) return response.forbidden({ message: 'No autorizado' })

      const data = await abonoValidator.validate(cleanEmptyStrings(request.all(), ['fechaPago']))
      const ventaId = data.ventaId || data.prestamoId
      const fechaPago = data.fechaPago || DateTime.now().setZone(TZ).toISODate()

      if (!ventaId || !data.monto || !fechaPago) {
        return response.badRequest({ message: 'Venta, monto y fecha de pago son obligatorios' })
      }

      const resultado = await aplicarAbonoAVenta({
        ventaId: Number(ventaId),
        monto: Number(data.monto),
        fechaPago,
        usuarioId: user.id,
      })

      await resultado.venta.load('cliente')
      await resultado.venta.load('lote')
      await resultado.venta.load('pagos')
      const resumen = this.resumenCuotas(resultado.venta)
      const pago = resultado.pagos[0]?.pago

      await registrarActividad({
        usuarioId: user.id,
        tipo: 'pago',
        entidad: 'pago',
        entidadId: pago?.id || resultado.venta.id,
        descripcion: `Registro abono de Q${resultado.totalAplicado} - lote ${resultado.venta.numeroLote || 'N/A'} / ${resultado.venta.cliente.nombres} ${resultado.venta.cliente.apellidos}`,
        detalle: {
          ventaId: resultado.venta.id,
          totalAplicado: resultado.totalAplicado,
          saldoRestante: resultado.saldoRestante,
          cuotasAplicadas: resultado.pagos.map((item) => ({
            numeroCuota: item.numeroCuota,
            monto: item.monto,
          })),
        },
      })

      return response.created({
        message: resultado.ventaPagada
          ? 'Abono registrado. La venta quedo saldada.'
          : 'Abono registrado correctamente',
        ...resultado,
        voucher: this.voucherPago({
          venta: resultado.venta,
          pagoId: pago?.id,
          tipo: pago?.tipoPago === 'enganche' ? 'enganche' : 'abono',
          montoPagado: resultado.totalAplicado,
          fechaPago,
          numeroCuota: null,
          resumen,
        }),
      })
    } catch (error) {
      if (isValidationError(error)) {
        return response.badRequest({
          message: 'Datos invalidos para registrar abono',
          errors: validationMessages(error),
        })
      }

      console.error(error)
      const message = error instanceof Error ? error.message : 'Error al registrar abono'
      return response.badRequest({ message })
    }
  }

  async programar({ request, response }: HttpContext) {
    try {
      const authHeader = request.header('authorization')
      const user = await this.verifyToken(authHeader || '')
      if (!user) return response.forbidden({ message: 'No autorizado' })

      const data = await programacionPagoValidator.validate(
        cleanEmptyStrings(request.all(), ['montoPagado'])
      )

      const ventaId = data.ventaId || data.prestamoId
      if (!ventaId || !data.tipoGestion || !data.fechaProgramada) {
        return response.badRequest({
          message: 'Venta, tipo de gestion y fecha programada son obligatorios',
        })
      }

      if (!['no_pago', 'pago_parcial'].includes(data.tipoGestion)) {
        return response.badRequest({ message: 'Tipo de gestion invalido' })
      }

      if (!String(data.nota || '').trim()) {
        return response.badRequest({
          message: 'Debes agregar una nota explicando la gestion realizada',
        })
      }

      const prestamo = await Prestamo.query()
        .where('id', ventaId)
        .preload('cliente')
        .preload('lote')
        .preload('pagos')
        .firstOrFail()

      const resumen = this.resumenCuotas(prestamo)
      if (!resumen.proximaCuota) {
        return response.conflict({ message: 'La venta ya no tiene cuotas pendientes' })
      }

      let montoParcial = 0
      let pagoParcial: Pago | null = null
      if (data.tipoGestion === 'pago_parcial') {
        montoParcial = Number(data.montoPagado || 0)
        if (montoParcial <= 0) {
          return response.badRequest({ message: 'Debes ingresar el monto parcial recibido' })
        }

        if (montoParcial - resumen.montoPendienteCuota > EPSILON) {
          return response.badRequest({
            message: 'El monto parcial excede el pendiente de la cuota',
          })
        }

        if (Math.abs(montoParcial - resumen.montoPendienteCuota) <= EPSILON) {
          return response.badRequest({
            message: 'Si se cubre todo el pendiente, registra el pago como completo',
          })
        }

        pagoParcial = await Pago.create({
          prestamoId: ventaId,
          numeroCuota: resumen.proximaCuota,
          montoPagado: montoParcial,
          fechaPago: DateTime.now().setZone(TZ),
          usuarioId: user.id,
          tipoPago: 'cuota',
        })
      }

      await this.resolverProgramaciones(ventaId, resumen.proximaCuota)

      const programacion = await ProgramacionPago.create({
        prestamoId: ventaId,
        usuarioId: user.id,
        numeroCuota: resumen.proximaCuota,
        tipoGestion: data.tipoGestion,
        montoRecibido: montoParcial,
        nota: data.nota || null,
        fechaProgramada: DateTime.fromISO(String(data.fechaProgramada), { zone: TZ }),
        resuelto: false,
      })

      await registrarActividad({
        usuarioId: user.id,
        tipo: 'actualizar',
        entidad: 'prestamo',
        entidadId: prestamo.id,
        descripcion:
          data.tipoGestion === 'no_pago'
            ? `Reprogramo cobro de cuota #${resumen.proximaCuota} para ${prestamo.cliente.nombres} ${prestamo.cliente.apellidos}`
            : `Registro pago parcial y reprogramo cuota #${resumen.proximaCuota} para ${prestamo.cliente.nombres} ${prestamo.cliente.apellidos}`,
        detalle: {
          tipoGestion: data.tipoGestion,
          nota: data.nota || null,
          fechaProgramada: data.fechaProgramada,
          montoPagado: montoParcial,
        },
      })

      await prestamo.load('pagos')
      const resumenFinal = this.resumenCuotas(prestamo)

      return response.created({
        message: 'Programacion guardada correctamente',
        programacion,
        voucher:
          data.tipoGestion === 'pago_parcial' && pagoParcial
            ? this.voucherPago({
                venta: prestamo,
                pagoId: pagoParcial.id,
                tipo: 'pago_parcial',
                montoPagado: montoParcial,
                fechaPago: this.fechaIso(pagoParcial.fechaPago),
                numeroCuota: resumen.proximaCuota,
                pendienteCuotaRestante: Number(
                  Math.max(resumen.montoPendienteCuota - montoParcial, 0).toFixed(2)
                ),
                resumen: resumenFinal,
                nota: data.nota || null,
                fechaProgramada: data.fechaProgramada,
              })
            : null,
      })
    } catch (error) {
      if (isValidationError(error)) {
        return response.badRequest({
          message: 'Datos invalidos para guardar programacion',
          errors: validationMessages(error),
        })
      }

      console.error(error)
      return response.internalServerError({ message: 'Error al guardar programacion de pago' })
    }
  }

  async destroy({ request, params, response }: HttpContext) {
    try {
      const authHeader = request.header('authorization')
      const user = await this.verifyToken(authHeader || '')
      if (!user) return response.forbidden({ message: 'No autorizado' })

      if (user.role !== 'admin') {
        return response.forbidden({ message: 'Solo el administrador puede eliminar pagos' })
      }

      const pago = await Pago.findOrFail(params.id)
      await pago.delete()

      await registrarActividad({
        usuarioId: user.id,
        tipo: 'eliminar',
        entidad: 'pago',
        entidadId: Number(params.id),
        descripcion: `Elimino el pago #${params.id}`,
      })

      return response.ok({ message: 'Pago eliminado exitosamente' })
    } catch (error) {
      console.error(error)
      return response.internalServerError({ message: 'Error al eliminar pago' })
    }
  }
}
