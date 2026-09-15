import { randomUUID } from 'node:crypto'
import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { DateTime } from 'luxon'
import Actividad from '#models/actividad'
import ApiToken from '#models/api_token'
import Client from '#models/client'
import Lote from '#models/lote'
import Pago from '#models/pago'
import PagoAplicacion from '#models/pago_aplicacion'
import Prestamo from '#models/prestamo'
import User from '#models/user'
import VentaPredio from '#models/venta_predio'

type DatosVentaMapa = {
  clienteId: number
  loteId: number
  monto: number
  cuotas: number
  fechaInicio: string
  fechaFin: string
  frecuenciaPago: string
  numeroLote: string
  medidaLote: string
  areaLote: string
  predios: Array<{
    loteId?: number
    numeroLote: string
    medidaLote?: string
    areaLote?: string
    precio?: number
  }>
  fechaCobro: string
  enganche: number
}

async function prepararEscenario() {
  const sufijo = randomUUID()
  const user = await User.create({
    name: 'Usuario venta mapa',
    email: `venta-mapa-${sufijo}@example.com`,
    username: `venta-mapa-${sufijo}`,
    role: 'trabajador',
    password: 'prueba-segura',
  })
  const token = await ApiToken.create({
    userId: user.id,
    type: 'api',
    token: `token-venta-mapa-${sufijo}`,
    expiresAt: null,
    createdAt: DateTime.now(),
  })
  const cliente = await Client.create({
    nombres: 'Cliente venta',
    apellidos: 'Desde mapa',
    telefono: sufijo.slice(0, 12),
    direccion: 'Direccion de prueba',
    zona: null,
    activo: true,
  })
  const lote = await Lote.create({
    numero: `MAPA-${sufijo.slice(0, 8)}`,
    medida: '12 x 24',
    area: '285.43',
    estado: 'disponible',
  })

  return { authorization: `Bearer ${token.token}`, user, token, cliente, lote }
}

function datosVenta(clienteId: number, lote: Lote): DatosVentaMapa {
  return {
    clienteId,
    loteId: lote.id,
    monto: 100_000,
    cuotas: 20,
    fechaInicio: '2026-01-01',
    fechaFin: '2027-09-01',
    frecuenciaPago: 'mensual',
    numeroLote: lote.numero,
    medidaLote: 'MEDIDA MANIPULADA',
    areaLote: '9999',
    predios: [
      {
        loteId: lote.id,
        numeroLote: lote.numero,
        medidaLote: 'MEDIDA MANIPULADA',
        areaLote: '9999',
      },
    ],
    fechaCobro: '2026-02-01',
    enganche: 0,
  }
}

async function crearVentaExistente(clienteId: number, loteId: number, estado = 'activo') {
  return Prestamo.create({
    clienteId,
    loteId,
    monto: 100_000,
    cuotas: 20,
    fechaInicio: DateTime.fromISO('2026-01-01'),
    fechaFin: DateTime.fromISO('2027-09-01'),
    frecuenciaPago: 'mensual',
    fechaCobro: DateTime.fromISO('2026-02-01'),
    estado,
  })
}

async function limpiarEscenarioPersistido(params: {
  userId: number
  tokenId: number
  clienteId: number
  loteIds: number[]
}) {
  const ventas = await Prestamo.query().where((query) => {
    query
      .whereIn('lote_id', params.loteIds)
      .orWhereHas('predios', (predios) => predios.whereIn('lote_id', params.loteIds))
  })
  const ventaIds = ventas.map((venta) => venta.id)

  await Actividad.query().where('usuario_id', params.userId).delete()
  if (ventaIds.length > 0) {
    await PagoAplicacion.query().whereIn('venta_id', ventaIds).delete()
    await Pago.query().whereIn('venta_id', ventaIds).delete()
    await VentaPredio.query().whereIn('venta_id', ventaIds).delete()
    await Prestamo.query().whereIn('id', ventaIds).delete()
  }
  await ApiToken.query().where('id', params.tokenId).delete()
  await Lote.query().whereIn('id', params.loteIds).delete()
  await Client.query().where('id', params.clienteId).delete()
  await User.query().where('id', params.userId).delete()
}

function registrarPruebasVentaSegura() {
  test.group('Venta segura desde el mapa', (group) => {
    group.each.setup(() => testUtils.db().withGlobalTransaction())

    test('crea la venta con el lote exacto y conserva sus datos autoritativos', async ({
      client,
      assert,
    }) => {
      const { authorization, cliente, lote } = await prepararEscenario()

      const response = await client
        .post('/api/ventas')
        .header('authorization', authorization)
        .json(datosVenta(cliente.id, lote))

      response.assertStatus(201)
      const ventaId = response.body().prestamo.id as number
      const venta = await Prestamo.findOrFail(ventaId)
      const predios = await VentaPredio.query().where('venta_id', ventaId)
      await lote.refresh()

      assert.equal(venta.loteId, lote.id)
      assert.equal(predios.length, 1)
      assert.equal(predios[0].loteId, lote.id)
      assert.equal(lote.numero.startsWith('MAPA-'), true)
      assert.equal(lote.medida, '12 x 24')
      assert.equal(lote.area, '285.43')
      assert.equal(lote.estado, 'vendido')
    })

    test('conserva el enganche sin convertirlo en cuota ni aplicacion FIFO', async ({
      client,
      assert,
    }) => {
      const { authorization, cliente, lote } = await prepararEscenario()
      const datos = datosVenta(cliente.id, lote)
      datos.monto = 120_000
      datos.enganche = 20_000

      const response = await client
        .post('/api/ventas')
        .header('authorization', authorization)
        .json(datos)

      response.assertStatus(201)
      const ventaId = response.body().prestamo.id as number
      const venta = await Prestamo.findOrFail(ventaId)
      const pagos = await Pago.query().where('venta_id', ventaId)

      assert.equal(Number(venta.monto), 120_000)
      assert.equal(venta.cuotas, 20)
      assert.lengthOf(pagos, 1)
      assert.equal(pagos[0].tipoPago, 'enganche')
      assert.equal(pagos[0].numeroCuota, 0)
      assert.equal(Number(pagos[0].montoPagado), 20_000)
      assert.lengthOf(await PagoAplicacion.query().where('pago_id', pagos[0].id), 0)

      const detalle = await client
        .get(`/api/ventas/${ventaId}`)
        .header('authorization', authorization)
      detalle.assertStatus(200)
      detalle.assertBodyContains({
        resumenFinanciero: {
          enganche: 20_000,
          montoFinanciado: 100_000,
          saldoPendiente: 100_000,
          cuotasPagadas: 0,
          cuotasContractuales: 20,
          fraccion: '0/20',
        },
      })
    })

    test('crea una venta manual multipredio con lotes seleccionados por loteId', async ({
      client,
      assert,
    }) => {
      const { authorization, cliente, lote } = await prepararEscenario()
      const segundo = await Lote.create({
        numero: `SELECTOR-${randomUUID().slice(0, 8)}`,
        medida: '15 x 25',
        area: '375',
        estado: 'disponible',
      })
      const datos = datosVenta(cliente.id, lote)
      datos.predios[0].precio = 60_000
      datos.predios.push({
        loteId: segundo.id,
        numeroLote: segundo.numero,
        medidaLote: 'MEDIDA MANIPULADA',
        areaLote: '9999',
        precio: 40_000,
      })

      const response = await client
        .post('/api/ventas')
        .header('authorization', authorization)
        .json(datos)

      response.assertStatus(201)
      const ventaId = response.body().prestamo.id as number
      const asociaciones = await VentaPredio.query().where('venta_id', ventaId).orderBy('id', 'asc')
      await lote.refresh()
      await segundo.refresh()

      assert.deepEqual(
        asociaciones.map((predio) => [predio.loteId, Number(predio.precio)]),
        [
          [lote.id, 60_000],
          [segundo.id, 40_000],
        ]
      )
      assert.equal(lote.medida, '12 x 24')
      assert.equal(lote.area, '285.43')
      assert.equal(segundo.medida, '15 x 25')
      assert.equal(segundo.area, '375')
    })

    test('sin loteId conserva datos autoritativos y no permite revender un lote existente', async ({
      client,
      assert,
    }) => {
      const { authorization, cliente, lote } = await prepararEscenario()
      const datos = datosVenta(cliente.id, lote)
      delete (datos as Partial<DatosVentaMapa>).loteId
      delete datos.predios[0].loteId

      const primera = await client
        .post('/api/ventas')
        .header('authorization', authorization)
        .json(datos)

      primera.assertStatus(201)
      await lote.refresh()
      assert.equal(lote.medida, '12 x 24')
      assert.equal(lote.area, '285.43')

      const segunda = await client
        .post('/api/ventas')
        .header('authorization', authorization)
        .json(datos)

      segunda.assertStatus(409)
      segunda.assertBodyContains({ loteId: lote.id })
      assert.equal(
        await VentaPredio.query()
          .where('lote_id', lote.id)
          .count('* as total')
          .then((rows) => Number(rows[0].$extras.total)),
        1
      )
    })

    test('conserva la venta normal multipredio y el enganche cuando no recibe loteId', async ({
      client,
      assert,
    }) => {
      const { authorization, cliente } = await prepararEscenario()
      const sufijo = randomUUID().slice(0, 8)
      const response = await client
        .post('/api/ventas')
        .header('authorization', authorization)
        .json({
          clienteId: cliente.id,
          monto: 120_000,
          cuotas: 20,
          fechaInicio: '2026-01-01',
          fechaFin: '2027-09-01',
          frecuenciaPago: 'mensual',
          numeroLote: `NORMAL-A-${sufijo}`,
          medidaLote: '10 x 20',
          areaLote: '200',
          predios: [
            {
              numeroLote: `NORMAL-A-${sufijo}`,
              medidaLote: '10 x 20',
              areaLote: '200',
              precio: 70_000,
            },
            {
              numeroLote: `NORMAL-B-${sufijo}`,
              medidaLote: '12 x 20',
              areaLote: '240',
              precio: 50_000,
            },
          ],
          fechaCobro: '2026-02-01',
          enganche: 20_000,
        })

      response.assertStatus(201)
      response.assertBodyContains({ message: 'Venta creada exitosamente con enganche registrado' })
      const ventaId = response.body().prestamo.id as number
      const venta = await Prestamo.findOrFail(ventaId)
      const predios = await VentaPredio.query().where('venta_id', ventaId).orderBy('id', 'asc')
      const lotes = await Lote.query()
        .whereIn('numero', [`NORMAL-A-${sufijo}`, `NORMAL-B-${sufijo}`])
        .orderBy('numero', 'asc')
      const pagos = await Pago.query().where('venta_id', ventaId)
      const actividades = await Actividad.query()
        .where('entidad', 'prestamo')
        .where('entidad_id', ventaId)

      assert.equal(venta.clienteId, cliente.id)
      assert.equal(Number(venta.monto), 120_000)
      assert.equal(venta.cuotas, 20)
      assert.equal(venta.fechaInicio.toISODate(), '2026-01-01')
      assert.equal(venta.fechaFin.toISODate(), '2027-09-01')
      assert.equal(venta.fechaCobro?.toISODate(), '2026-02-01')
      assert.equal(venta.frecuenciaPago, 'mensual')
      assert.lengthOf(predios, 2)
      assert.deepEqual(
        predios.map((predio) => Number(predio.precio)),
        [70_000, 50_000]
      )
      assert.lengthOf(lotes, 2)
      assert.deepEqual(
        lotes.map((loteCreado) => [loteCreado.numero, loteCreado.medida, loteCreado.area]),
        [
          [`NORMAL-A-${sufijo}`, '10 x 20', '200'],
          [`NORMAL-B-${sufijo}`, '12 x 20', '240'],
        ]
      )
      assert.lengthOf(pagos, 1)
      assert.equal(pagos[0].tipoPago, 'enganche')
      assert.equal(pagos[0].numeroCuota, 0)
      assert.equal(Number(pagos[0].montoPagado), 20_000)
      assert.equal(pagos[0].anulado, false)
      assert.lengthOf(await PagoAplicacion.query().where('pago_id', pagos[0].id), 0)
      assert.lengthOf(actividades, 1)

      const detalle = await client
        .get(`/api/ventas/${ventaId}`)
        .header('authorization', authorization)
      detalle.assertStatus(200)
      detalle.assertBodyContains({
        resumenFinanciero: {
          enganche: 20_000,
          montoFinanciado: 100_000,
          totalPagado: 0,
          saldoPendiente: 100_000,
          cuotasPagadas: 0,
          cuotasContractuales: 20,
          fraccion: '0/20',
          cuotaActual: 1,
        },
      })
    })

    test('rechaza si el lote cambia de disponible a ocupado antes del POST', async ({
      client,
      assert,
    }) => {
      const { authorization, cliente, lote } = await prepararEscenario()
      const listadoInicial = await client.get('/api/lotes').header('authorization', authorization)
      listadoInicial.assertStatus(200)
      assert.deepInclude(
        listadoInicial.body().lotes.find((item: { loteId: number }) => item.loteId === lote.id),
        { disponible: true, estadoDisponibilidad: 'disponible' }
      )
      const ventaExistente = await crearVentaExistente(cliente.id, lote.id)
      await VentaPredio.create({ ventaId: ventaExistente.id, loteId: lote.id, precio: null })

      const response = await client
        .post('/api/ventas')
        .header('authorization', authorization)
        .json(datosVenta(cliente.id, lote))

      response.assertStatus(409)
      response.assertBodyContains({ loteId: lote.id })
    })

    test('rechaza una asociacion activa guardada solamente en lote_id legacy', async ({
      client,
    }) => {
      const { authorization, cliente, lote } = await prepararEscenario()
      await crearVentaExistente(cliente.id, lote.id)

      const response = await client
        .post('/api/ventas')
        .header('authorization', authorization)
        .json(datosVenta(cliente.id, lote))

      response.assertStatus(409)
      response.assertBodyContains({ loteId: lote.id })
    })

    test('rechaza un lote con conflicto de varias ventas activas', async ({ client, assert }) => {
      const { authorization, cliente, lote } = await prepararEscenario()
      const primera = await crearVentaExistente(cliente.id, lote.id)
      const segunda = await crearVentaExistente(cliente.id, lote.id)
      await VentaPredio.createMany([
        { ventaId: primera.id, loteId: lote.id, precio: null },
        { ventaId: segunda.id, loteId: lote.id, precio: null },
      ])

      const response = await client
        .post('/api/ventas')
        .header('authorization', authorization)
        .json(datosVenta(cliente.id, lote))

      response.assertStatus(409)
      response.assertBodyContains({ loteId: lote.id })
      assert.equal(
        await Prestamo.query()
          .where('estado', '!=', 'cancelado')
          .whereHas('predios', (predios) => predios.where('lote_id', lote.id))
          .count('* as total')
          .then((rows) => Number(rows[0].$extras.total)),
        2
      )
    })

    test('rechaza loteId inexistente o que no coincide con el numero', async ({
      client,
      assert,
    }) => {
      const { authorization, cliente, lote } = await prepararEscenario()
      const ventasAntes = await Prestamo.query().count('* as total')
      const inexistente = datosVenta(cliente.id, lote)
      inexistente.loteId = lote.id + 999_999
      inexistente.predios[0].loteId = inexistente.loteId

      const responseInexistente = await client
        .post('/api/ventas')
        .header('authorization', authorization)
        .json(inexistente)
      responseInexistente.assertStatus(404)

      const discrepante = datosVenta(cliente.id, lote)
      discrepante.numeroLote = 'OTRO-LOTE'
      discrepante.predios[0].numeroLote = 'OTRO-LOTE'
      const responseDiscrepante = await client
        .post('/api/ventas')
        .header('authorization', authorization)
        .json(discrepante)
      responseDiscrepante.assertStatus(400)

      const ventasDespues = await Prestamo.query().count('* as total')
      assert.equal(Number(ventasDespues[0].$extras.total), Number(ventasAntes[0].$extras.total))
    })

    test('ignora una venta cancelada al reutilizar el lote', async ({ client }) => {
      const { authorization, cliente, lote } = await prepararEscenario()
      const cancelada = await crearVentaExistente(cliente.id, lote.id, 'cancelado')
      await VentaPredio.create({ ventaId: cancelada.id, loteId: lote.id, precio: null })

      const response = await client
        .post('/api/ventas')
        .header('authorization', authorization)
        .json(datosVenta(cliente.id, lote))

      response.assertStatus(201)
    })

    test('rechaza y revierte si cualquier predio adicional esta ocupado', async ({
      client,
      assert,
    }) => {
      const { authorization, cliente, lote } = await prepararEscenario()
      const ocupado = await Lote.create({
        numero: `OCUPADO-${randomUUID().slice(0, 8)}`,
        medida: '10 x 20',
        area: '200',
        estado: 'vendido',
      })
      const ventaExistente = await crearVentaExistente(cliente.id, ocupado.id)
      await VentaPredio.create({ ventaId: ventaExistente.id, loteId: ocupado.id, precio: null })
      const datos = datosVenta(cliente.id, lote)
      datos.predios.push({
        loteId: ocupado.id,
        numeroLote: ocupado.numero,
        medidaLote: ocupado.medida || '',
        areaLote: ocupado.area || '',
      })

      const response = await client
        .post('/api/ventas')
        .header('authorization', authorization)
        .json(datos)

      response.assertStatus(409)
      response.assertBodyContains({ loteId: ocupado.id })
      await lote.refresh()
      assert.equal(lote.estado, 'disponible')
      assert.equal(
        await Prestamo.query()
          .where('lote_id', lote.id)
          .count('* as total')
          .then((rows) => Number(rows[0].$extras.total)),
        0
      )
    })

    test('rechaza el mismo lote mezclando loteId y numero', async ({ client, assert }) => {
      const { authorization, cliente, lote } = await prepararEscenario()
      const datos = datosVenta(cliente.id, lote)
      datos.predios.push({
        numeroLote: lote.numero,
        medidaLote: lote.medida || '',
        areaLote: lote.area || '',
      })

      const response = await client
        .post('/api/ventas')
        .header('authorization', authorization)
        .json(datos)

      response.assertStatus(400)
      response.assertBodyContains({ loteId: lote.id })
      await lote.refresh()
      assert.equal(lote.estado, 'disponible')
      assert.equal(
        await VentaPredio.query()
          .where('lote_id', lote.id)
          .count('* as total')
          .then((r) => Number(r[0].$extras.total)),
        0
      )
      assert.equal(
        await Prestamo.query()
          .where('lote_id', lote.id)
          .count('* as total')
          .then((r) => Number(r[0].$extras.total)),
        0
      )
    })

    test('rechaza dos predios con el mismo loteId', async ({ client, assert }) => {
      const { authorization, cliente, lote } = await prepararEscenario()
      const datos = datosVenta(cliente.id, lote)
      datos.predios.push({
        loteId: lote.id,
        numeroLote: lote.numero,
        medidaLote: lote.medida || '',
        areaLote: lote.area || '',
      })

      const response = await client
        .post('/api/ventas')
        .header('authorization', authorization)
        .json(datos)

      response.assertStatus(400)
      response.assertBodyContains({ loteId: lote.id })
      await lote.refresh()
      assert.equal(lote.estado, 'disponible')
      assert.equal(
        await VentaPredio.query()
          .where('lote_id', lote.id)
          .count('* as total')
          .then((rows) => Number(rows[0].$extras.total)),
        0
      )
    })

    test('revierte todos los cambios si otro lote del formulario es invalido', async ({
      client,
      assert,
    }) => {
      const { authorization, cliente, lote } = await prepararEscenario()
      const datos = datosVenta(cliente.id, lote)
      datos.predios.push({
        loteId: lote.id + 999_999,
        numeroLote: 'INEXISTENTE',
        medidaLote: '',
        areaLote: '',
      })

      const response = await client
        .post('/api/ventas')
        .header('authorization', authorization)
        .json(datos)

      response.assertStatus(404)
      await lote.refresh()
      assert.equal(lote.estado, 'disponible')
      assert.equal(
        await VentaPredio.query()
          .where('lote_id', lote.id)
          .count('* as total')
          .then((r) => Number(r[0].$extras.total)),
        0
      )
      assert.equal(
        await Prestamo.query()
          .where('lote_id', lote.id)
          .count('* as total')
          .then((r) => Number(r[0].$extras.total)),
        0
      )
    })
  })
}

test.group('Rollback de venta desde el mapa', () => {
  test('revierte lotes y venta si falla la insercion de un predio', async ({ client, assert }) => {
    const { authorization, user, token, cliente, lote } = await prepararEscenario()
    const segundo = await Lote.create({
      numero: `ROLLBACK-${randomUUID().slice(0, 8)}`,
      medida: '10 x 20',
      area: '200',
      estado: 'disponible',
    })

    try {
      const datos = datosVenta(cliente.id, lote)
      datos.predios.push({
        loteId: segundo.id,
        numeroLote: segundo.numero,
        medidaLote: segundo.medida || '',
        areaLote: segundo.area || '',
        precio: 100_000_000_000_000,
      })

      const response = await client
        .post('/api/ventas')
        .header('authorization', authorization)
        .json(datos)

      response.assertStatus(500)
      await lote.refresh()
      await segundo.refresh()
      assert.equal(lote.estado, 'disponible')
      assert.equal(segundo.estado, 'disponible')
      assert.equal(
        await Prestamo.query()
          .whereIn('lote_id', [lote.id, segundo.id])
          .count('* as total')
          .then((rows) => Number(rows[0].$extras.total)),
        0
      )
      assert.equal(
        await VentaPredio.query()
          .whereIn('lote_id', [lote.id, segundo.id])
          .count('* as total')
          .then((rows) => Number(rows[0].$extras.total)),
        0
      )
    } finally {
      await limpiarEscenarioPersistido({
        userId: user.id,
        tokenId: token.id,
        clienteId: cliente.id,
        loteIds: [lote.id, segundo.id],
      })
    }
  })
})

test.group('Concurrencia de venta desde el mapa', () => {
  test('dos solicitudes simultaneas dejan una sola venta ganadora', async ({ client, assert }) => {
    const { authorization, user, token, cliente, lote } = await prepararEscenario()

    try {
      const [respuestaA, respuestaB] = await Promise.all([
        client
          .post('/api/ventas')
          .header('authorization', authorization)
          .json(datosVenta(cliente.id, lote)),
        client
          .post('/api/ventas')
          .header('authorization', authorization)
          .json(datosVenta(cliente.id, lote)),
      ])
      const respuestas = [respuestaA, respuestaB]

      assert.deepEqual(
        respuestas.map((respuesta) => respuesta.status()).sort((a, b) => a - b),
        [201, 409]
      )
      const rechazada = respuestas.find((respuesta) => respuesta.status() === 409)
      assert.equal(rechazada?.body().loteId, lote.id)

      const ventas = await Prestamo.query()
        .where('estado', '!=', 'cancelado')
        .where((query) => {
          query
            .where('lote_id', lote.id)
            .orWhereHas('predios', (predios) => predios.where('lote_id', lote.id))
        })
      const asociaciones = await VentaPredio.query().where('lote_id', lote.id)

      assert.lengthOf(ventas, 1)
      assert.lengthOf(asociaciones, 1)
      assert.equal(asociaciones[0].ventaId, ventas[0].id)
    } finally {
      await limpiarEscenarioPersistido({
        userId: user.id,
        tokenId: token.id,
        clienteId: cliente.id,
        loteIds: [lote.id],
      })
    }
  })
})

registrarPruebasVentaSegura()
