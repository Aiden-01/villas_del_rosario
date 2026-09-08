import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { DateTime } from 'luxon'
import ApiToken from '#models/api_token'
import Client from '#models/client'
import Pago from '#models/pago'
import PagoAplicacion from '#models/pago_aplicacion'
import Prestamo from '#models/prestamo'
import ProgramacionPago from '#models/programacion_pago'
import User from '#models/user'
import { aplicarPagoVenta } from '#services/aplicar_pago_service'
import { calcularPlanCuotas } from '#services/cuotas_ventas_service'
import { reconstruirAplicacionesVenta } from '#services/reconstruir_aplicaciones_service'

async function crearVentaVeinteCuotas(sufijo: string) {
  const cliente = await Client.create({
    nombres: `FIFO ${sufijo}`,
    apellidos: 'Prueba',
    telefono: `5555${Math.floor(Math.random() * 8999 + 1000)}`,
    direccion: 'Direccion de prueba',
    zona: null,
    activo: true,
  })

  return Prestamo.create({
    clienteId: cliente.id,
    loteId: null,
    monto: 100_000,
    cuotas: 20,
    fechaInicio: DateTime.fromISO('2026-01-01'),
    fechaFin: DateTime.fromISO('2027-09-01'),
    fechaCobro: DateTime.fromISO('2026-01-01'),
    estado: 'activo',
    frecuenciaPago: 'mensual',
  })
}

async function crearVentaConEnganche(sufijo: string) {
  const venta = await crearVentaVeinteCuotas(sufijo)
  venta.monto = 120_000
  await venta.save()

  const enganche = await Pago.create({
    prestamoId: venta.id,
    usuarioId: null,
    numeroCuota: 0,
    montoPagado: 20_000,
    tipoPago: 'enganche',
    fechaPago: DateTime.fromISO('2025-12-01'),
    anulado: false,
  })

  return { venta, enganche }
}

async function crearSesion(sufijo: string, role: 'admin' | 'trabajador' = 'trabajador') {
  const unique = `${sufijo}-${Date.now()}-${Math.random()}`
  const user = await User.create({
    name: 'Usuario FIFO',
    email: `${unique}@example.com`,
    username: unique,
    role,
    password: 'prueba-segura',
  })
  const token = await ApiToken.create({
    userId: user.id,
    type: 'api',
    token: `token-${unique}`,
    expiresAt: null,
    createdAt: DateTime.now(),
  })
  return `Bearer ${token.token}`
}

async function aplicacionesPago(pagoId: number) {
  const filas = await PagoAplicacion.query().where('pago_id', pagoId).orderBy('numero_cuota', 'asc')
  return filas.map((fila) => ({
    numeroCuota: fila.numeroCuota,
    montoAplicado: Number(fila.montoAplicado),
  }))
}

async function snapshotAplicaciones(ventaId: number) {
  const filas = await PagoAplicacion.query()
    .where('venta_id', ventaId)
    .orderBy('pago_id', 'asc')
    .orderBy('numero_cuota', 'asc')
  return filas.map((fila) => ({
    pagoId: fila.pagoId,
    ventaId: fila.ventaId,
    numeroCuota: fila.numeroCuota,
    montoAplicado: Number(fila.montoAplicado),
  }))
}

async function snapshotPagos(ventaId: number) {
  const pagos = await Pago.query().where('venta_id', ventaId).orderBy('id', 'asc')
  return pagos.map((pago) => ({
    id: pago.id,
    prestamoId: pago.prestamoId,
    usuarioId: pago.usuarioId,
    numeroCuota: pago.numeroCuota,
    montoPagado: Number(pago.montoPagado),
    tipoPago: pago.tipoPago,
    fechaPago: pago.fechaPago.toISODate(),
    anulado: pago.anulado,
    anuladoAt: pago.anuladoAt ?? null,
    anuladoPor: pago.anuladoPor ?? null,
    motivoAnulacion: pago.motivoAnulacion ?? null,
  }))
}

function comprobarLimitesContractuales(
  assert: any,
  venta: Prestamo,
  aplicaciones: Array<{ numeroCuota: number; montoAplicado: number }>
) {
  const limites = new Map(calcularPlanCuotas(venta).map((cuota) => [cuota.numero, cuota.monto]))
  const totales = new Map<number, number>()
  for (const aplicacion of aplicaciones) {
    const total = (totales.get(aplicacion.numeroCuota) || 0) + aplicacion.montoAplicado
    totales.set(aplicacion.numeroCuota, Number(total.toFixed(2)))
  }
  for (const [numeroCuota, total] of totales) {
    assert.isTrue(total <= (limites.get(numeroCuota) || 0) + 0.005)
  }
  return [...totales.entries()]
}

test.group('Aplicacion FIFO persistida', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('tres pagos consecutivos continúan desde pago_aplicaciones sin superponerse', async ({
    assert,
  }) => {
    const venta = await crearVentaVeinteCuotas('Consecutivos')

    const primero = await aplicarPagoVenta({
      ventaId: venta.id,
      monto: 12_000,
      fechaPago: '2026-01-01',
      usuarioId: null,
    })
    assert.equal(primero.pago.numeroCuota, 0)
    assert.deepEqual(await aplicacionesPago(primero.pago.id), [
      { numeroCuota: 1, montoAplicado: 5000 },
      { numeroCuota: 2, montoAplicado: 5000 },
      { numeroCuota: 3, montoAplicado: 2000 },
    ])

    const segundo = await aplicarPagoVenta({
      ventaId: venta.id,
      monto: 8_000,
      fechaPago: '2026-01-02',
      usuarioId: null,
    })
    assert.equal(segundo.pago.numeroCuota, 0)
    assert.deepEqual(await aplicacionesPago(segundo.pago.id), [
      { numeroCuota: 3, montoAplicado: 3000 },
      { numeroCuota: 4, montoAplicado: 5000 },
    ])
    assert.equal(segundo.resumenFinal.cuotasPagadas, 4)
    assert.equal(segundo.resumenFinal.proximaCuota, 5)
    assert.equal(segundo.resumenFinal.saldoPendiente, 80_000)

    const tercero = await aplicarPagoVenta({
      ventaId: venta.id,
      monto: 2_500,
      fechaPago: '2026-01-03',
      usuarioId: null,
      tipoPago: 'pago_parcial',
    })
    assert.equal(tercero.pago.numeroCuota, 0)
    assert.deepEqual(await aplicacionesPago(tercero.pago.id), [
      { numeroCuota: 5, montoAplicado: 2500 },
    ])
    assert.equal(tercero.resumenFinal.cuotasPagadas, 4)
    assert.equal(tercero.resumenFinal.proximaCuota, 5)
    assert.equal(tercero.resumenFinal.montoPendienteCuota, 2500)
    assert.equal(tercero.resumenFinal.saldoPendiente, 77_500)

    const todas = await snapshotAplicaciones(venta.id)
    assert.deepEqual(comprobarLimitesContractuales(assert, venta, todas), [
      [1, 5000],
      [2, 5000],
      [3, 5000],
      [4, 5000],
      [5, 2500],
    ])

    for (const resultado of [primero, segundo, tercero]) {
      const aplicaciones = await aplicacionesPago(resultado.pago.id)
      const totalAplicado = aplicaciones.reduce(
        (total, aplicacion) => total + aplicacion.montoAplicado,
        0
      )
      assert.equal(totalAplicado, Number(resultado.pago.montoPagado))
    }
  })

  test('POST /api/pagos/abonos registra Q12000 y Q8000 como pagos unicos con FIFO', async ({
    client,
    assert,
  }) => {
    const venta = await crearVentaVeinteCuotas('API')
    const authorization = await crearSesion('fifo-api')

    const primero = await client
      .post('/api/pagos/abonos')
      .header('authorization', authorization)
      .json({ ventaId: venta.id, monto: 12_000, fechaPago: '2026-01-01' })

    primero.assertStatus(201)
    assert.deepEqual(primero.body().aplicaciones, [
      { numeroCuota: 1, montoAplicado: 5000 },
      { numeroCuota: 2, montoAplicado: 5000 },
      { numeroCuota: 3, montoAplicado: 2000 },
    ])
    assert.deepEqual(primero.body().voucher.aplicaciones, primero.body().aplicaciones)
    assert.equal(primero.body().voucher.venta.cuotasPagadas, 2)
    assert.equal(primero.body().voucher.venta.proximaCuota, 3)
    assert.equal(primero.body().voucher.venta.pendienteCuotaActual, 3000)
    assert.equal(primero.body().voucher.venta.saldoRestante, 88_000)

    const pagosPrimero = await Pago.query().where('venta_id', venta.id)
    assert.lengthOf(pagosPrimero, 1)
    assert.equal(Number(pagosPrimero[0].montoPagado), 12_000)
    assert.equal(pagosPrimero[0].numeroCuota, 0)
    assert.deepEqual(await aplicacionesPago(pagosPrimero[0].id), primero.body().aplicaciones)
    assert.equal(
      await ProgramacionPago.query()
        .where('venta_id', venta.id)
        .count('* as total')
        .first()
        .then((row) => Number(row?.$extras.total)),
      0
    )

    const segundo = await client
      .post('/api/pagos/abonos')
      .header('authorization', authorization)
      .json({ ventaId: venta.id, monto: 8_000, fechaPago: '2026-01-02' })

    segundo.assertStatus(201)
    assert.deepEqual(segundo.body().aplicaciones, [
      { numeroCuota: 3, montoAplicado: 3000 },
      { numeroCuota: 4, montoAplicado: 5000 },
    ])
    assert.equal(segundo.body().voucher.venta.cuotasPagadas, 4)
    assert.equal(segundo.body().voucher.venta.proximaCuota, 5)
    assert.equal(segundo.body().voucher.venta.saldoRestante, 80_000)
    assert.lengthOf(await Pago.query().where('venta_id', venta.id), 2)

    const excedente = await client
      .post('/api/pagos/abonos')
      .header('authorization', authorization)
      .json({ ventaId: venta.id, monto: 80_000.01, fechaPago: '2026-01-03' })

    excedente.assertStatus(400)
    assert.lengthOf(await Pago.query().where('venta_id', venta.id), 2)
  })

  test('los listados exponen el resumen autoritativo de un abono que cubre varias cuotas', async ({
    client,
    assert,
  }) => {
    const clienteVenta = await Client.create({
      nombres: 'FIFO Listados',
      apellidos: 'Prueba',
      telefono: `5555${Math.floor(Math.random() * 8999 + 1000)}`,
      direccion: 'Direccion de prueba',
      zona: null,
      activo: true,
    })
    const venta = await Prestamo.create({
      clienteId: clienteVenta.id,
      loteId: null,
      monto: 175_000,
      cuotas: 36,
      fechaInicio: DateTime.fromISO('2026-01-01'),
      fechaFin: DateTime.fromISO('2028-12-01'),
      fechaCobro: DateTime.fromISO('2026-01-01'),
      estado: 'activo',
      frecuenciaPago: 'mensual',
    })
    await Pago.create({
      prestamoId: venta.id,
      usuarioId: null,
      numeroCuota: 0,
      montoPagado: 7_500,
      tipoPago: 'enganche',
      fechaPago: DateTime.fromISO('2025-12-01'),
      anulado: false,
    })
    const authorization = await crearSesion('fifo-listados')

    const primerPago = await client
      .post('/api/pagos/abonos')
      .header('authorization', authorization)
      .json({ ventaId: venta.id, monto: 20_000, fechaPago: '2026-01-01' })
    primerPago.assertStatus(201)

    const segundoPago = await client
      .post('/api/pagos/abonos')
      .header('authorization', authorization)
      .json({ ventaId: venta.id, monto: 4_652.78, fechaPago: '2026-02-01' })
    segundoPago.assertStatus(201)

    const esperado = {
      enganche: 7_500,
      montoFinanciado: 167_500,
      totalPagado: 24_652.78,
      saldoPendiente: 142_847.22,
      cuotasPagadas: 5,
      cuotasContractuales: 36,
      fraccion: '5/36',
      porcentaje: 14,
      cuotaActual: 6,
      valorCuotaActual: 4_652.77,
      pagadoCuotaActual: 1_388.93,
      pendienteCuotaActual: 3_263.84,
    }

    const listado = await client.get('/api/ventas').header('authorization', authorization)
    listado.assertStatus(200)
    const ventaEnListado = listado.body().find((item: any) => item.id === venta.id)
    assert.exists(ventaEnListado)
    assert.deepEqual(
      Object.fromEntries(
        Object.keys(esperado).map((key) => [key, ventaEnListado.resumenFinanciero[key]])
      ),
      esperado
    )

    const listadoCliente = await client
      .get(`/api/ventas/cliente/${clienteVenta.id}`)
      .header('authorization', authorization)
    listadoCliente.assertStatus(200)
    const ventaDelCliente = listadoCliente.body().find((item: any) => item.id === venta.id)
    assert.exists(ventaDelCliente)
    assert.deepEqual(
      Object.fromEntries(
        Object.keys(esperado).map((key) => [key, ventaDelCliente.resumenFinanciero[key]])
      ),
      esperado
    )
  })

  test('anular el segundo pago restaura el resumen persistido y conserva el historial', async ({
    client,
    assert,
  }) => {
    const venta = await crearVentaVeinteCuotas('Anulacion')
    const authorization = await crearSesion('fifo-anulacion', 'admin')

    const primero = await client
      .post('/api/pagos/abonos')
      .header('authorization', authorization)
      .json({ ventaId: venta.id, monto: 12_000, fechaPago: '2026-01-01' })
    primero.assertStatus(201)

    const segundo = await client
      .post('/api/pagos/abonos')
      .header('authorization', authorization)
      .json({ ventaId: venta.id, monto: 5_000, fechaPago: '2026-01-02' })
    segundo.assertStatus(201)

    const pagosAntes = await Pago.query().where('venta_id', venta.id).orderBy('id', 'asc')
    assert.lengthOf(pagosAntes, 2)
    const primerPago = pagosAntes[0]
    const segundoPago = pagosAntes[1]

    const anulacion = await client
      .post(`/api/pagos/${segundoPago.id}/anular`)
      .header('authorization', authorization)
      .json({ motivo: 'Pago registrado por error' })
    anulacion.assertStatus(200)

    const detalle = await client
      .get(`/api/ventas/${venta.id}`)
      .header('authorization', authorization)
    detalle.assertStatus(200)
    detalle.assertBodyContains({
      resumenFinanciero: {
        saldoPendiente: 88_000,
        cuotasPagadas: 2,
        fraccion: '2/20',
        porcentaje: 10,
        cuotaActual: 3,
        valorCuotaActual: 5_000,
        pagadoCuotaActual: 2_000,
        pendienteCuotaActual: 3_000,
      },
    })

    const historial = await client
      .get(`/api/pagos/venta/${venta.id}`)
      .header('authorization', authorization)
    historial.assertStatus(200)
    assert.lengthOf(historial.body(), 2)
    const pagoAnulado = historial.body().find((pago: any) => pago.id === segundoPago.id)
    assert.isTrue(pagoAnulado.anulado)
    assert.equal(pagoAnulado.motivoAnulacion, 'Pago registrado por error')
    assert.lengthOf(pagoAnulado.aplicaciones, 0)

    await segundoPago.refresh()
    assert.isTrue(segundoPago.anulado)
    assert.lengthOf(await Pago.query().where('venta_id', venta.id), 2)
    assert.deepEqual(await aplicacionesPago(primerPago.id), [
      { numeroCuota: 1, montoAplicado: 5000 },
      { numeroCuota: 2, montoAplicado: 5000 },
      { numeroCuota: 3, montoAplicado: 2000 },
    ])
    assert.deepEqual(await aplicacionesPago(segundoPago.id), [])
  })

  test('pagos legacy y nuevos conviven y el backfill es idempotente', async ({ assert }) => {
    const venta = await crearVentaVeinteCuotas('Legacy')
    const legacy = await Pago.create({
      prestamoId: venta.id,
      usuarioId: null,
      numeroCuota: 1,
      montoPagado: 12_000,
      tipoPago: 'cuota',
      fechaPago: DateTime.fromISO('2026-01-01'),
      anulado: false,
    })

    const nuevo = await aplicarPagoVenta({
      ventaId: venta.id,
      monto: 8_000,
      fechaPago: '2026-01-02',
      usuarioId: null,
    })

    await legacy.refresh()
    assert.equal(legacy.numeroCuota, 1)
    assert.equal(nuevo.pago.numeroCuota, 0)
    assert.deepEqual(await aplicacionesPago(legacy.id), [
      { numeroCuota: 1, montoAplicado: 5000 },
      { numeroCuota: 2, montoAplicado: 5000 },
      { numeroCuota: 3, montoAplicado: 2000 },
    ])
    assert.deepEqual(await aplicacionesPago(nuevo.pago.id), [
      { numeroCuota: 3, montoAplicado: 3000 },
      { numeroCuota: 4, montoAplicado: 5000 },
    ])

    const pagosAntes = await snapshotPagos(venta.id)
    await reconstruirAplicacionesVenta(venta.id)
    const primeraReconstruccion = await snapshotAplicaciones(venta.id)
    await reconstruirAplicacionesVenta(venta.id)
    const segundaReconstruccion = await snapshotAplicaciones(venta.id)

    assert.deepEqual(segundaReconstruccion, primeraReconstruccion)
    assert.deepEqual(await snapshotPagos(venta.id), pagosAntes)
    assert.deepEqual(comprobarLimitesContractuales(assert, venta, segundaReconstruccion), [
      [1, 5000],
      [2, 5000],
      [3, 5000],
      [4, 5000],
    ])
  })

  test('enganche y cuota legacy se reconstruyen sin alterar pagos y el detalle muestra 1/20', async ({
    client,
    assert,
  }) => {
    const { venta, enganche } = await crearVentaConEnganche('Enganche legacy')
    const authorization = await crearSesion('enganche-legacy')
    const legacy = await Pago.create({
      prestamoId: venta.id,
      usuarioId: null,
      numeroCuota: 1,
      montoPagado: 5_000,
      tipoPago: 'cuota',
      fechaPago: DateTime.fromISO('2026-01-01'),
      anulado: false,
    })

    assert.deepEqual(await snapshotAplicaciones(venta.id), [])
    const pagosAntes = await snapshotPagos(venta.id)

    await reconstruirAplicacionesVenta(venta.id)
    const primeraReconstruccion = await snapshotAplicaciones(venta.id)
    await reconstruirAplicacionesVenta(venta.id)
    const segundaReconstruccion = await snapshotAplicaciones(venta.id)

    assert.deepEqual(segundaReconstruccion, primeraReconstruccion)
    assert.deepEqual(await snapshotPagos(venta.id), pagosAntes)
    assert.deepEqual(await aplicacionesPago(enganche.id), [])
    assert.deepEqual(await aplicacionesPago(legacy.id), [{ numeroCuota: 1, montoAplicado: 5000 }])
    assert.lengthOf(segundaReconstruccion, 1)

    const detalle = await client
      .get(`/api/ventas/${venta.id}`)
      .header('authorization', authorization)

    detalle.assertStatus(200)
    detalle.assertBodyContains({
      resumenFinanciero: {
        enganche: 20_000,
        montoFinanciado: 100_000,
        totalPagado: 5_000,
        saldoPendiente: 95_000,
        cuotasPagadas: 1,
        fraccion: '1/20',
        porcentaje: 5,
        cuotaActual: 2,
        valorCuotaActual: 5_000,
        pagadoCuotaActual: 0,
        pendienteCuotaActual: 5_000,
      },
    })
  })

  test('POST /api/pagos crea una sola cuota con aplicación y detalle financiero correcto', async ({
    client,
    assert,
  }) => {
    const { venta, enganche } = await crearVentaConEnganche('Pago completo')
    const authorization = await crearSesion('enganche-pago-completo')

    const respuesta = await client.post('/api/pagos').header('authorization', authorization).json({
      prestamoId: venta.id,
      numeroCuota: 1,
      montoPagado: 5_000,
      fechaPago: '2026-01-01',
    })

    respuesta.assertStatus(201)

    const pagos = await Pago.query().where('venta_id', venta.id).orderBy('id', 'asc')
    assert.lengthOf(pagos, 2)
    assert.equal(pagos[0].id, enganche.id)
    const pagoCuota = pagos[1]
    assert.equal(pagoCuota.numeroCuota, 1)
    assert.equal(Number(pagoCuota.montoPagado), 5_000)
    assert.equal(pagoCuota.tipoPago, 'cuota')
    const aplicaciones = [{ numeroCuota: 1, montoAplicado: 5000 }]
    assert.deepEqual(respuesta.body().aplicaciones, aplicaciones)
    assert.deepEqual(await aplicacionesPago(pagoCuota.id), aplicaciones)
    assert.lengthOf(await snapshotAplicaciones(venta.id), 1)

    const detalle = await client
      .get(`/api/ventas/${venta.id}`)
      .header('authorization', authorization)

    detalle.assertStatus(200)
    detalle.assertBodyContains({
      resumenFinanciero: {
        enganche: 20_000,
        montoFinanciado: 100_000,
        totalPagado: 5_000,
        saldoPendiente: 95_000,
        cuotasPagadas: 1,
        fraccion: '1/20',
        porcentaje: 5,
        cuotaActual: 2,
        valorCuotaActual: 5_000,
        pagadoCuotaActual: 0,
        pendienteCuotaActual: 5_000,
      },
    })
  })
})
