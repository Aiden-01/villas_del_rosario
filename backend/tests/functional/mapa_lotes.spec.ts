import { randomUUID } from 'node:crypto'
import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import ApiToken from '#models/api_token'
import Client from '#models/client'
import Lote from '#models/lote'
import Pago from '#models/pago'
import PagoAplicacion from '#models/pago_aplicacion'
import Prestamo from '#models/prestamo'
import User from '#models/user'
import VentaPredio from '#models/venta_predio'

type PropiedadesLote = {
  loteId: number
  codigo: string
  numero: string
  medida: string | null
  area: number
  habilitadoVenta: boolean
  estadoMapa: 'disponible' | 'no_autorizado' | 'vendido' | 'pagado' | 'mora' | 'conflicto'
  ventaId: number | null
  cliente: { id: number; nombres: string; apellidos: string } | null
  resumenFinanciero: Record<string, unknown> | null
  conflictoIntegridad?: boolean
  cantidadVentasActivas?: number
}

type FeatureLote = {
  type: 'Feature'
  geometry: {
    type: 'Polygon'
    coordinates: number[][][]
  }
  properties: PropiedadesLote
}

async function crearSesion() {
  const sufijo = randomUUID()
  const user = await User.create({
    name: 'Usuario mapa',
    email: `mapa-${sufijo}@example.com`,
    username: `mapa-${sufijo}`,
    role: 'trabajador',
    password: 'prueba-segura',
  })
  const token = await ApiToken.create({
    userId: user.id,
    type: 'api',
    token: `token-mapa-${sufijo}`,
    expiresAt: null,
    createdAt: DateTime.now(),
  })

  return { user, authorization: `Bearer ${token.token}` }
}

async function crearCliente(etiqueta: string) {
  const sufijo = randomUUID()
  return Client.create({
    nombres: `Cliente ${etiqueta}`,
    apellidos: 'Mapa',
    telefono: sufijo.slice(0, 12),
    direccion: 'Direccion de prueba',
    zona: null,
    activo: true,
  })
}

let desplazamientoGeometria = 0

async function crearLoteConGeometria(
  etiqueta: string,
  areaFuente: number,
  habilitadoVenta = false
) {
  const sufijo = randomUUID().slice(0, 8)
  const lote = await Lote.create({
    numero: `${etiqueta}-${sufijo}`,
    medida: `10x20 ${etiqueta}`,
    area: '999.99 m2',
    estado: 'disponible',
    habilitadoVenta,
  })
  const codigo = `MAP-${etiqueta}-${sufijo}`
  const x = -89 + desplazamientoGeometria * 0.001
  desplazamientoGeometria++
  const geometry = {
    type: 'Polygon',
    coordinates: [
      [
        [x, 16],
        [x + 0.0005, 16],
        [x + 0.0005, 16.0005],
        [x, 16.0005],
        [x, 16],
      ],
    ],
  }

  await db.rawQuery(
    `
      INSERT INTO lote_geometrias
        (lote_id, codigo, area_fuente, geom, created_at, updated_at)
      VALUES
        (?, ?, ?, ST_SetSRID(ST_GeomFromGeoJSON(?), 4326)::geometry(Polygon, 4326), NOW(), NOW())
    `,
    [lote.id, codigo, areaFuente, JSON.stringify(geometry)]
  )

  return { lote, codigo, areaFuente }
}

async function crearVenta(params: {
  clienteId: number
  loteId: number | null
  estado?: 'activo' | 'vencido' | 'pagado' | 'cancelado'
  monto?: number
  cuotas?: number
  fechaCobro?: DateTime
}) {
  const fechaCobro = params.fechaCobro ?? DateTime.fromISO('2099-01-15')
  const cuotas = params.cuotas ?? 2
  return Prestamo.create({
    clienteId: params.clienteId,
    loteId: params.loteId,
    monto: params.monto ?? 1_000,
    cuotas,
    fechaInicio: fechaCobro,
    fechaFin: fechaCobro.plus({ months: Math.max(cuotas - 1, 0) }),
    estado: params.estado ?? 'activo',
    frecuenciaPago: 'mensual',
    fechaCobro,
  })
}

function buscarFeature(features: FeatureLote[], codigo: string) {
  return features.find((feature) => feature.properties.codigo === codigo)
}

test.group('API GeoJSON de lotes', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('GET /api/mapa/lotes requiere autenticacion', async ({ client }) => {
    const response = await client.get('/api/mapa/lotes')

    response.assertStatus(401)
  })

  test('expone conflicto cuando un lote tiene mas de una venta no cancelada', async ({
    client,
    assert,
  }) => {
    desplazamientoGeometria = 0
    const { authorization } = await crearSesion()
    const clientePredio = await crearCliente('Conflicto predio')
    const clienteLegacy = await crearCliente('Conflicto legacy')
    const clienteCancelado = await crearCliente('Conflicto cancelado')
    const lote = await crearLoteConGeometria('CONFLICTO', 725.5)

    const ventaPredio = await crearVenta({
      clienteId: clientePredio.id,
      loteId: null,
    })
    await VentaPredio.create({
      ventaId: ventaPredio.id,
      loteId: lote.lote.id,
      precio: 1_000,
    })

    await crearVenta({
      clienteId: clienteLegacy.id,
      loteId: lote.lote.id,
    })

    const ventaCancelada = await crearVenta({
      clienteId: clienteCancelado.id,
      loteId: null,
      estado: 'cancelado',
    })
    await VentaPredio.create({
      ventaId: ventaCancelada.id,
      loteId: lote.lote.id,
      precio: 1_000,
    })

    const response = await client.get('/api/mapa/lotes').header('authorization', authorization)
    response.assertStatus(200)
    const body = response.body() as { type: string; features: FeatureLote[] }
    const feature = buscarFeature(body.features, lote.codigo)

    assert.exists(feature)
    assert.equal(feature!.properties.estadoMapa, 'conflicto')
    assert.isTrue(feature!.properties.conflictoIntegridad)
    assert.equal(feature!.properties.cantidadVentasActivas, 2)
    assert.isNull(feature!.properties.ventaId)
    assert.isNull(feature!.properties.cliente)
    assert.isNull(feature!.properties.resumenFinanciero)
  })

  test('devuelve FeatureCollection con asociaciones y estados autoritativos', async ({
    client,
    assert,
  }) => {
    desplazamientoGeometria = 0
    const { user, authorization } = await crearSesion()
    const clienteMulti = await crearCliente('Multi')
    const clienteLegacy = await crearCliente('Legacy')
    const clienteCancelado = await crearCliente('Cancelado')
    const clientePagado = await crearCliente('Pagado')
    const clienteMora = await crearCliente('Mora')

    const loteDisponible = await crearLoteConGeometria('DISP', 101.25, true)
    const loteNoAutorizado = await crearLoteConGeometria('NO-AUTORIZADO', 102.75)
    const loteMultiUno = await crearLoteConGeometria('MULTI-1', 202.5)
    const loteMultiDos = await crearLoteConGeometria('MULTI-2', 203.75)
    const loteLegacy = await crearLoteConGeometria('LEGACY', 304.5)
    const loteCancelado = await crearLoteConGeometria('CANCEL', 405.25, true)
    const lotePagado = await crearLoteConGeometria('PAGADO', 506.75)
    const loteMora = await crearLoteConGeometria('MORA', 607.5)

    const ventaMulti = await crearVenta({
      clienteId: clienteMulti.id,
      loteId: loteDisponible.lote.id,
    })
    await VentaPredio.createMany([
      { ventaId: ventaMulti.id, loteId: loteMultiUno.lote.id, precio: 500 },
      { ventaId: ventaMulti.id, loteId: loteMultiDos.lote.id, precio: 500 },
    ])
    const pagoMulti = await Pago.create({
      prestamoId: ventaMulti.id,
      usuarioId: user.id,
      numeroCuota: 99,
      montoPagado: 600,
      tipoPago: 'abono',
      fechaPago: DateTime.fromISO('2099-01-15'),
      anulado: false,
    })
    await PagoAplicacion.createMany([
      { pagoId: pagoMulti.id, ventaId: ventaMulti.id, numeroCuota: 1, montoAplicado: 500 },
      { pagoId: pagoMulti.id, ventaId: ventaMulti.id, numeroCuota: 2, montoAplicado: 100 },
    ])

    const ventaLegacy = await crearVenta({
      clienteId: clienteLegacy.id,
      loteId: loteLegacy.lote.id,
    })

    const ventaCancelada = await crearVenta({
      clienteId: clienteCancelado.id,
      loteId: loteCancelado.lote.id,
      estado: 'cancelado',
    })
    await VentaPredio.create({
      ventaId: ventaCancelada.id,
      loteId: loteCancelado.lote.id,
      precio: 1_000,
    })

    const ventaPagada = await crearVenta({
      clienteId: clientePagado.id,
      loteId: lotePagado.lote.id,
      estado: 'pagado',
      monto: 1_000,
      cuotas: 1,
    })
    const pagoCompleto = await Pago.create({
      prestamoId: ventaPagada.id,
      usuarioId: user.id,
      numeroCuota: 1,
      montoPagado: 1_000,
      tipoPago: 'cuota',
      fechaPago: DateTime.fromISO('2099-01-15'),
      anulado: false,
    })
    await PagoAplicacion.create({
      pagoId: pagoCompleto.id,
      ventaId: ventaPagada.id,
      numeroCuota: 1,
      montoAplicado: 1_000,
    })

    const fechaMora = DateTime.now().setZone('America/Guatemala').minus({ months: 2 })
    const ventaMora = await crearVenta({
      clienteId: clienteMora.id,
      loteId: loteMora.lote.id,
      estado: 'vencido',
      monto: 500,
      cuotas: 1,
      fechaCobro: fechaMora,
    })

    const response = await client.get('/api/mapa/lotes').header('authorization', authorization)
    response.assertStatus(200)
    const body = response.body() as { type: string; features: FeatureLote[] }
    assert.equal(body.type, 'FeatureCollection')
    assert.isArray(body.features)

    for (const lote of [
      loteDisponible,
      loteNoAutorizado,
      loteMultiUno,
      loteMultiDos,
      loteLegacy,
      loteCancelado,
      lotePagado,
      loteMora,
    ]) {
      const feature = buscarFeature(body.features, lote.codigo)
      assert.exists(feature)
      assert.equal(feature!.type, 'Feature')
      assert.equal(feature!.geometry.type, 'Polygon')
      assert.isArray(feature!.geometry.coordinates)
      assert.equal(feature!.properties.loteId, lote.lote.id)
      assert.equal(feature!.properties.numero, lote.lote.numero)
      assert.equal(feature!.properties.medida, lote.lote.medida)
      assert.equal(feature!.properties.area, lote.areaFuente)
      assert.isNumber(feature!.properties.area)
    }

    const disponible = buscarFeature(body.features, loteDisponible.codigo)!
    assert.isTrue(disponible.properties.habilitadoVenta)
    assert.equal(disponible.properties.estadoMapa, 'disponible')
    assert.isNull(disponible.properties.ventaId)
    assert.isNull(disponible.properties.cliente)
    assert.isNull(disponible.properties.resumenFinanciero)

    const noAutorizado = buscarFeature(body.features, loteNoAutorizado.codigo)!
    assert.isFalse(noAutorizado.properties.habilitadoVenta)
    assert.equal(noAutorizado.properties.estadoMapa, 'no_autorizado')
    assert.isNull(noAutorizado.properties.ventaId)
    assert.isNull(noAutorizado.properties.cliente)
    assert.isNull(noAutorizado.properties.resumenFinanciero)

    const multiUno = buscarFeature(body.features, loteMultiUno.codigo)!
    const multiDos = buscarFeature(body.features, loteMultiDos.codigo)!
    for (const feature of [multiUno, multiDos]) {
      assert.equal(feature.properties.estadoMapa, 'vendido')
      assert.equal(feature.properties.ventaId, ventaMulti.id)
      assert.deepEqual(feature.properties.cliente, {
        id: clienteMulti.id,
        nombres: clienteMulti.nombres,
        apellidos: clienteMulti.apellidos,
      })
      assert.deepInclude(feature.properties.resumenFinanciero!, {
        cuotasContractuales: 2,
        totalPagado: 600,
        saldoPendiente: 400,
        cuotasPagadas: 1,
        fraccion: '1/2',
        cuotaActual: 2,
        pagadoCuotaActual: 100,
        pendienteCuotaActual: 400,
        enMora: false,
      })
    }
    assert.deepEqual(multiUno.properties.resumenFinanciero, multiDos.properties.resumenFinanciero)

    const legacy = buscarFeature(body.features, loteLegacy.codigo)!
    assert.equal(legacy.properties.estadoMapa, 'vendido')
    assert.equal(legacy.properties.ventaId, ventaLegacy.id)
    assert.equal(legacy.properties.cliente?.id, clienteLegacy.id)

    const cancelado = buscarFeature(body.features, loteCancelado.codigo)!
    assert.equal(cancelado.properties.estadoMapa, 'disponible')
    assert.isNull(cancelado.properties.ventaId)
    assert.isNull(cancelado.properties.cliente)
    assert.isNull(cancelado.properties.resumenFinanciero)

    const pagado = buscarFeature(body.features, lotePagado.codigo)!
    assert.equal(pagado.properties.estadoMapa, 'pagado')
    assert.equal(pagado.properties.ventaId, ventaPagada.id)
    assert.deepInclude(pagado.properties.resumenFinanciero!, {
      saldoPendiente: 0,
      cuotasPagadas: 1,
      fraccion: '1/1',
      estado: 'pagado',
    })

    const mora = buscarFeature(body.features, loteMora.codigo)!
    assert.equal(mora.properties.estadoMapa, 'mora')
    assert.equal(mora.properties.ventaId, ventaMora.id)
    assert.deepInclude(mora.properties.resumenFinanciero!, {
      saldoPendiente: 500,
      cuotasPagadas: 0,
      enMora: true,
      estado: 'vencido',
    })
  })
})
