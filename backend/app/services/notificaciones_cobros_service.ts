import nodemailer from 'nodemailer'
import { DateTime } from 'luxon'
import Prestamo from '#models/prestamo'
import NotificacionCobro from '#models/notificacion_cobro'

const TZ = 'America/Guatemala'
const EPSILON = 0.01

type PagoLike = { numeroCuota: number; montoPagado: number; tipoPago?: string | null }

type CobroPendiente = {
  prestamoId: number
  numeroCuota: number
  cliente: string
  telefono: string | null
  numeroLote: string | null
  montoPendiente: number
  fechaProgramada: string
  esReprogramado: boolean
  nota: string | null
}

export type ResultadoNotificacionesCobros = {
  fecha: string
  encontrados: number
  pendientesDeEnviar: number
  enviados: number
  omitidos: number
  dryRun: boolean
}

function money(value: number) {
  return `Q${Number(value || 0).toLocaleString('es-GT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function boolEnv(name: string, defaultValue = false) {
  const value = process.env[name]
  if (value === undefined) return defaultValue
  return ['true', '1', 'yes', 'si'].includes(value.toLowerCase())
}

function cuotaMonto(venta: Prestamo) {
  return Number((Number(venta.monto) / Number(venta.cuotas || 1)).toFixed(2))
}

function agruparPagos(pagos: PagoLike[]) {
  const resumen = new Map<number, number>()
  for (const pago of pagos) {
    if (pago.numeroCuota <= 0 || (pago.tipoPago && pago.tipoPago !== 'cuota')) continue

    const actual = resumen.get(pago.numeroCuota) || 0
    resumen.set(pago.numeroCuota, Number((actual + Number(pago.montoPagado)).toFixed(2)))
  }
  return resumen
}

function resumenCuotas(venta: Prestamo) {
  const montoCuota = cuotaMonto(venta)
  const pagosPorCuota = agruparPagos((venta.pagos || []) as PagoLike[])
  const totalPagado = Number(
    ((venta.pagos || []) as PagoLike[])
      .reduce((sum, pago) => sum + Number(pago.montoPagado), 0)
      .toFixed(2)
  )
  const saldoPendiente = Number(Math.max(Number(venta.monto) - totalPagado, 0).toFixed(2))

  if (saldoPendiente <= 0.01) {
    return {
      proximaCuota: null,
      montoPendienteCuota: 0,
    }
  }

  for (let cuota = 1; cuota <= Number(venta.cuotas || 0); cuota++) {
    const pagado = pagosPorCuota.get(cuota) || 0
    if (pagado + EPSILON >= montoCuota) continue

    return {
      proximaCuota: cuota,
      montoPendienteCuota: Number(Math.min(montoCuota - pagado, saldoPendiente).toFixed(2)),
    }
  }

  return {
    proximaCuota: Number(venta.cuotas || 0) || null,
    montoPendienteCuota: Number(venta.cuotas || 0) ? saldoPendiente : 0,
  }
}

function fechaIso(fecha: any) {
  if (!fecha) return null
  if (typeof fecha.toISODate === 'function') return fecha.toISODate()
  return DateTime.fromJSDate(new Date(fecha)).setZone(TZ).toISODate()
}

function fechaProgramadaVenta(venta: Prestamo, numeroCuota: number) {
  const base = venta.fechaCobro || venta.fechaInicio
  if (!base) return null

  const baseDate =
    typeof (base as any).plus === 'function'
      ? DateTime.fromObject(
          {
            year: (base as DateTime).year,
            month: (base as DateTime).month,
            day: (base as DateTime).day,
          },
          { zone: TZ }
        )
      : DateTime.fromISO(String(base), { zone: TZ })

  return baseDate.plus({ months: Math.max(numeroCuota - 1, 0) }).toISODate()
}

function construirPendiente(venta: Prestamo): CobroPendiente | null {
  const resumen = resumenCuotas(venta)
  if (!resumen.proximaCuota) return null

  const abierta = (venta.programaciones || [])
    .filter((item) => !item.resuelto && item.numeroCuota === resumen.proximaCuota)
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))[0]

  const fechaPactada = fechaProgramadaVenta(venta, resumen.proximaCuota)
  const fechaProgramada = abierta ? fechaIso(abierta.fechaProgramada) : fechaPactada
  if (!fechaProgramada) return null

  return {
    prestamoId: venta.id,
    numeroCuota: resumen.proximaCuota,
    cliente: `${venta.cliente.nombres} ${venta.cliente.apellidos}`.trim(),
    telefono: venta.cliente.telefono || null,
    numeroLote: venta.numeroLote,
    montoPendiente: resumen.montoPendienteCuota,
    fechaProgramada,
    esReprogramado: Boolean(abierta),
    nota: abierta?.nota || null,
  }
}

async function obtenerCobrosDeLaFecha(fecha: string) {
  const ventas = await Prestamo.query()
    .whereIn('estado', ['activo', 'vencido'])
    .preload('cliente')
    .preload('lote')
    .preload('pagos')
    .preload('programaciones')

  return ventas
    .map((venta) => construirPendiente(venta))
    .filter((item): item is CobroPendiente => Boolean(item && item.fechaProgramada === fecha))
}

function crearTransporter() {
  const host = process.env.SMTP_HOST
  const port = Number(process.env.SMTP_PORT || 587)
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS

  if (!host || !user || !pass) {
    throw new Error('Faltan SMTP_HOST, SMTP_USER o SMTP_PASS para enviar correos')
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: boolEnv('SMTP_SECURE', port === 465),
    auth: { user, pass },
  })
}

function construirCorreo(fecha: string, cobros: CobroPendiente[]) {
  const total = cobros.reduce((sum, item) => sum + item.montoPendiente, 0)
  const fechaLabel = DateTime.fromISO(fecha, { zone: TZ }).setLocale('es').toFormat('dd LLLL yyyy')

  const lineas = cobros.map((item, index) => {
    const lote = item.numeroLote ? `Lote ${item.numeroLote}` : 'Lote N/A'
    const telefono = item.telefono ? ` - Tel. ${item.telefono}` : ''
    const reprogramado = item.esReprogramado ? ' - Reprogramado' : ''
    const nota = item.nota ? ` - Nota: ${item.nota}` : ''
    return `${index + 1}. ${item.cliente} - ${lote} - cuota #${item.numeroCuota} - ${money(item.montoPendiente)}${telefono}${reprogramado}${nota}`
  })

  const rows = cobros
    .map((item) => {
      const lote = item.numeroLote || 'N/A'
      const telefono = item.telefono || ''
      const nota = item.nota || ''
      const tipo = item.esReprogramado ? 'Reprogramado' : 'Pactado'
      return `<tr>
        <td>${item.cliente}</td>
        <td>${lote}</td>
        <td>${item.numeroCuota}</td>
        <td>${money(item.montoPendiente)}</td>
        <td>${telefono}</td>
        <td>${tipo}</td>
        <td>${nota}</td>
      </tr>`
    })
    .join('')

  return {
    subject: `Cobros para hoy - ${fechaLabel}`,
    text: [
      `Cobros para hoy (${fechaLabel})`,
      '',
      ...lineas,
      '',
      `Total a cobrar: ${money(total)}`,
    ].join('\n'),
    html: `<div style="font-family:Arial,sans-serif;color:#1f2937">
      <h2>Cobros para hoy (${fechaLabel})</h2>
      <table cellpadding="8" cellspacing="0" style="border-collapse:collapse;width:100%">
        <thead>
          <tr style="background:#f3f4f6">
            <th align="left">Cliente</th>
            <th align="left">Lote</th>
            <th align="left">Cuota</th>
            <th align="left">Monto</th>
            <th align="left">Telefono</th>
            <th align="left">Tipo</th>
            <th align="left">Nota</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p><strong>Total a cobrar: ${money(total)}</strong></p>
    </div>`,
  }
}

export async function notificarCobrosDelDia(
  fechaInput?: string
): Promise<ResultadoNotificacionesCobros> {
  const fecha = fechaInput || DateTime.now().setZone(TZ).toISODate()!
  const dryRun = boolEnv('COBROS_NOTIFICACIONES_DRY_RUN')
  const cobros = await obtenerCobrosDeLaFecha(fecha)

  if (dryRun) {
    return {
      fecha,
      encontrados: cobros.length,
      pendientesDeEnviar: cobros.length,
      enviados: 0,
      omitidos: 0,
      dryRun,
    }
  }

  const pendientes: CobroPendiente[] = []

  for (const cobro of cobros) {
    const registro = await NotificacionCobro.firstOrCreate(
      {
        prestamoId: cobro.prestamoId,
        numeroCuota: cobro.numeroCuota,
        fechaProgramada: DateTime.fromISO(cobro.fechaProgramada, { zone: TZ }),
        canal: 'email',
      },
      {
        prestamoId: cobro.prestamoId,
        numeroCuota: cobro.numeroCuota,
        fechaProgramada: DateTime.fromISO(cobro.fechaProgramada, { zone: TZ }),
        canal: 'email',
      }
    )

    if (!registro.sentAt) {
      pendientes.push(cobro)
    }
  }

  if (pendientes.length === 0) {
    return {
      fecha,
      encontrados: cobros.length,
      pendientesDeEnviar: 0,
      enviados: 0,
      omitidos: cobros.length,
      dryRun,
    }
  }

  const to = process.env.COBROS_NOTIFY_TO
  if (!to) {
    throw new Error('Falta COBROS_NOTIFY_TO para saber a que correo enviar el resumen')
  }

  const from = process.env.SMTP_FROM || process.env.SMTP_USER
  const transporter = crearTransporter()
  const correo = construirCorreo(fecha, pendientes)

  await transporter.sendMail({
    from,
    to,
    subject: correo.subject,
    text: correo.text,
    html: correo.html,
  })

  const sentAt = DateTime.now().setZone(TZ)
  for (const pendiente of pendientes) {
    await NotificacionCobro.query()
      .where('canal', 'email')
      .where('venta_id', pendiente.prestamoId)
      .where('numero_cuota', pendiente.numeroCuota)
      .where('fecha_programada', fecha)
      .update({ sent_at: sentAt.toSQL() })
  }

  return {
    fecha,
    encontrados: cobros.length,
    pendientesDeEnviar: pendientes.length,
    enviados: pendientes.length,
    omitidos: cobros.length - pendientes.length,
    dryRun,
  }
}
