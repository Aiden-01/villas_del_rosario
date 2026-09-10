import { randomUUID } from 'node:crypto'
import type { Assert } from '@japa/assert'
import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import ExcelJS from 'exceljs'
import { DateTime } from 'luxon'
import ApiToken from '#models/api_token'
import Client from '#models/client'
import Pago from '#models/pago'
import Prestamo from '#models/prestamo'
import User from '#models/user'

const MIME_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

async function crearSesionAdmin(sufijo: string) {
  const unique = `${sufijo}-${randomUUID()}`
  const user = await User.create({
    name: 'Administrador de reportes',
    email: `${unique}@example.com`,
    username: unique,
    role: 'admin',
    password: 'prueba-segura',
  })
  const token = await ApiToken.create({
    userId: user.id,
    type: 'api',
    token: `token-${unique}`,
    expiresAt: null,
    createdAt: DateTime.now(),
  })

  return { user, authorization: `Bearer ${token.token}` }
}

async function crearVenta(params: {
  sufijo: string
  fecha: string
  monto: number
  cuotas: number
}) {
  const cliente = await Client.create({
    nombres: `Reporte ${params.sufijo}`,
    apellidos: 'Prueba',
    telefono: `5555${Math.floor(Math.random() * 8999 + 1000)}`,
    direccion: 'Direccion de prueba',
    zona: null,
    activo: true,
  })
  const fechaInicio = DateTime.fromISO(params.fecha)
  const venta = await Prestamo.create({
    clienteId: cliente.id,
    loteId: null,
    monto: params.monto,
    cuotas: params.cuotas,
    fechaInicio,
    fechaFin: fechaInicio.plus({ months: params.cuotas - 1 }),
    fechaCobro: fechaInicio,
    estado: 'activo',
    frecuenciaPago: 'mensual',
  })

  return { cliente, venta, nombreCliente: `${cliente.nombres} ${cliente.apellidos}` }
}

function assertResumenFIFO(assert: Assert, resumen: any) {
  assert.exists(resumen)
  assert.deepEqual(
    {
      cuotasContractuales: resumen.cuotasContractuales,
      montoTotal: resumen.montoTotal,
      enganche: resumen.enganche,
      montoFinanciado: resumen.montoFinanciado,
      totalPagado: resumen.totalPagado,
      saldoPendiente: resumen.saldoPendiente,
      cuotasPagadas: resumen.cuotasPagadas,
      fraccion: resumen.fraccion,
      porcentaje: resumen.porcentaje,
      cuotaActual: resumen.cuotaActual,
      pagadoCuotaActual: resumen.pagadoCuotaActual,
      pendienteCuotaActual: resumen.pendienteCuotaActual,
      enMora: resumen.enMora,
      diasAtraso: resumen.diasAtraso,
      estado: resumen.estado,
    },
    {
      cuotasContractuales: 36,
      montoTotal: 175_000,
      enganche: 7_500,
      montoFinanciado: 167_500,
      totalPagado: 24_652.78,
      saldoPendiente: 142_847.22,
      cuotasPagadas: 5,
      fraccion: '5/36',
      porcentaje: 14,
      cuotaActual: 6,
      pagadoCuotaActual: 1_388.93,
      pendienteCuotaActual: 3_263.84,
      enMora: false,
      diasAtraso: 0,
      estado: 'activo',
    }
  )
}

function parsearBinario(response: any, callback: (error: Error | null, body: Buffer) => void) {
  const chunks: Buffer[] = []
  response.on('data', (chunk: Buffer) => chunks.push(Buffer.from(chunk)))
  response.on('end', () => callback(null, Buffer.concat(chunks)))
}

test.group('Reportes financieros autoritativos', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('ventas y cartera exponen el resumen persistido de un abono multicuota', async ({
    client,
    assert,
  }) => {
    const fechaVenta = '2098-04-15'
    const { user, authorization } = await crearSesionAdmin('fifo')
    const { venta } = await crearVenta({
      sufijo: 'FIFO',
      fecha: fechaVenta,
      monto: 175_000,
      cuotas: 36,
    })
    await Pago.create({
      prestamoId: venta.id,
      usuarioId: user.id,
      numeroCuota: 0,
      montoPagado: 7_500,
      tipoPago: 'enganche',
      fechaPago: DateTime.fromISO('2098-04-14'),
      anulado: false,
    })

    await client
      .post('/api/pagos/abonos')
      .header('authorization', authorization)
      .json({ ventaId: venta.id, monto: 20_000, fechaPago: '2098-04-15' })
      .then((response) => response.assertStatus(201))
    await client
      .post('/api/pagos/abonos')
      .header('authorization', authorization)
      .json({ ventaId: venta.id, monto: 4_652.78, fechaPago: '2098-05-15' })
      .then((response) => response.assertStatus(201))

    const filtros = `fechaInicio=${fechaVenta}&fechaFin=${fechaVenta}`
    const reporteVentas = await client
      .get(`/api/reportes/ventas?${filtros}`)
      .header('authorization', authorization)
    reporteVentas.assertStatus(200)
    const ventaReportada = reporteVentas.body().find((item: any) => item.id === venta.id)
    assert.exists(ventaReportada)
    assertResumenFIFO(assert, ventaReportada.resumenFinanciero)

    const cartera = await client
      .get(`/api/reportes/cartera?${filtros}`)
      .header('authorization', authorization)
    cartera.assertStatus(200)
    const itemCartera = cartera
      .body()
      .detalle.find((item: any) => item.id === venta.id || item.ventaId === venta.id)
    assert.exists(itemCartera)
    assertResumenFIFO(assert, itemCartera.resumenFinanciero)
    assert.equal(cartera.body().totalVentas, 1)
    assert.equal(cartera.body().totalValorLotes, 175_000)
    assert.equal(cartera.body().totalCobradoHistorico, 32_152.78)
    assert.equal(cartera.body().totalSaldoPendiente, 142_847.22)
    assert.equal(cartera.body().totalCuotasPagadas, 5)
    assert.equal(cartera.body().totalCuotas, 36)
    assert.equal(cartera.body().porcentajeGeneral, 14)
  })

  test('un pago anulado se conserva, se excluye de pagos y no afecta ventas ni cartera', async ({
    client,
    assert,
  }) => {
    const fechaVenta = '2098-07-15'
    const { authorization } = await crearSesionAdmin('anulado')
    const { venta } = await crearVenta({
      sufijo: 'Anulado',
      fecha: fechaVenta,
      monto: 10_000,
      cuotas: 2,
    })

    await client
      .post('/api/pagos/abonos')
      .header('authorization', authorization)
      .json({ ventaId: venta.id, monto: 5_000, fechaPago: fechaVenta })
      .then((response) => response.assertStatus(201))
    const pago = await Pago.query()
      .where('venta_id', venta.id)
      .where('tipo_pago', 'abono')
      .firstOrFail()

    await client
      .post(`/api/pagos/${pago.id}/anular`)
      .header('authorization', authorization)
      .json({ motivo: 'Pago registrado por error' })
      .then((response) => response.assertStatus(200))

    const filtros = `fechaInicio=${fechaVenta}&fechaFin=${fechaVenta}`
    const pagos = await client
      .get(`/api/reportes/pagos?${filtros}`)
      .header('authorization', authorization)
    pagos.assertStatus(200)
    assert.notExists(pagos.body().find((item: any) => item.id === pago.id))

    const reporteVentas = await client
      .get(`/api/reportes/ventas?${filtros}`)
      .header('authorization', authorization)
    reporteVentas.assertStatus(200)
    const ventaReportada = reporteVentas.body().find((item: any) => item.id === venta.id)
    assert.exists(ventaReportada)
    assert.deepEqual(
      {
        totalPagado: ventaReportada.resumenFinanciero.totalPagado,
        saldoPendiente: ventaReportada.resumenFinanciero.saldoPendiente,
        cuotasPagadas: ventaReportada.resumenFinanciero.cuotasPagadas,
        fraccion: ventaReportada.resumenFinanciero.fraccion,
        cuotaActual: ventaReportada.resumenFinanciero.cuotaActual,
      },
      {
        totalPagado: 0,
        saldoPendiente: 10_000,
        cuotasPagadas: 0,
        fraccion: '0/2',
        cuotaActual: 1,
      }
    )

    const cartera = await client
      .get(`/api/reportes/cartera?${filtros}`)
      .header('authorization', authorization)
    cartera.assertStatus(200)
    assert.equal(cartera.body().totalCobradoHistorico, 0)
    assert.equal(cartera.body().totalSaldoPendiente, 10_000)
    assert.equal(cartera.body().totalCuotasPagadas, 0)
    assert.equal(cartera.body().totalCuotas, 2)
    assert.equal(cartera.body().porcentajeGeneral, 0)
    const itemCartera = cartera
      .body()
      .detalle.find((item: any) => item.id === venta.id || item.ventaId === venta.id)
    assert.exists(itemCartera)
    assert.equal(itemCartera.resumenFinanciero.totalPagado, 0)
    assert.equal(itemCartera.resumenFinanciero.saldoPendiente, 10_000)
    assert.equal(itemCartera.resumenFinanciero.cuotasPagadas, 0)

    await pago.refresh()
    assert.isTrue(pago.anulado)
    assert.equal(
      await Pago.query()
        .where('id', pago.id)
        .count('* as total')
        .then((rows) => Number(rows[0].$extras.total)),
      1
    )
  })

  test('Excel y PDF se generan desde las cifras autoritativas de cartera', async ({
    client,
    assert,
  }) => {
    const fechaVenta = '2098-10-15'
    const { user, authorization } = await crearSesionAdmin('exportacion')
    const { venta, nombreCliente } = await crearVenta({
      sufijo: 'Exportacion',
      fecha: fechaVenta,
      monto: 175_000,
      cuotas: 36,
    })
    await Pago.create({
      prestamoId: venta.id,
      usuarioId: user.id,
      numeroCuota: 0,
      montoPagado: 7_500,
      tipoPago: 'enganche',
      fechaPago: DateTime.fromISO('2098-10-14'),
      anulado: false,
    })
    await client
      .post('/api/pagos/abonos')
      .header('authorization', authorization)
      .json({ ventaId: venta.id, monto: 20_000, fechaPago: '2098-10-15' })
      .then((response) => response.assertStatus(201))
    await client
      .post('/api/pagos/abonos')
      .header('authorization', authorization)
      .json({ ventaId: venta.id, monto: 4_652.78, fechaPago: '2098-11-15' })
      .then((response) => response.assertStatus(201))

    const filtros = `fechaInicio=${fechaVenta}&fechaFin=${fechaVenta}`
    const excel = await client
      .get(`/api/reportes/exportar/excel?tipo=cartera&${filtros}`)
      .header('authorization', authorization)
      .setup((request) => request.request.buffer(true).parse(parsearBinario))
    excel.assertStatus(200)
    assert.equal(excel.type(), MIME_XLSX)
    assert.isTrue(Buffer.isBuffer(excel.body()))

    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(excel.body())
    const sheet = workbook.getWorksheet('Cartera')
    assert.exists(sheet)
    let filaVenta: ExcelJS.Row | undefined
    sheet!.eachRow((row) => {
      if (row.getCell(1).text === nombreCliente) filaVenta = row
    })
    assert.exists(filaVenta)
    assert.equal(filaVenta!.getCell(3).text, '5/36 (14%)')
    assert.equal(Number(filaVenta!.getCell(4).value), 32_152.78)
    assert.equal(Number(filaVenta!.getCell(5).value), 142_847.22)

    const pdf = await client
      .get(`/api/reportes/exportar/pdf?tipo=cartera&${filtros}`)
      .header('authorization', authorization)
    pdf.assertStatus(200)
    assert.equal(pdf.type(), 'application/pdf')
    assert.isTrue(Buffer.isBuffer(pdf.body()))
    assert.equal(pdf.body().subarray(0, 5).toString('ascii'), '%PDF-')
  })
})
