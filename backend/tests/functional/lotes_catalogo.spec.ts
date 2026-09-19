import { randomUUID } from 'node:crypto'
import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { DateTime } from 'luxon'
import ApiToken from '#models/api_token'
import Client from '#models/client'
import Lote from '#models/lote'
import Prestamo from '#models/prestamo'
import User from '#models/user'
import VentaPredio from '#models/venta_predio'

type LoteCatalogo = {
  loteId: number
  numero: string
  area: string | null
  medida: string | null
  habilitadoVenta: boolean
  estadoDisponibilidad: 'disponible' | 'no_autorizado' | 'ocupado' | 'conflicto'
  disponible: boolean
  cantidadVentasActivas: number
}

async function crearSesion() {
  const sufijo = randomUUID()
  const user = await User.create({
    name: 'Usuario catalogo lotes',
    email: `catalogo-lotes-${sufijo}@example.com`,
    username: `catalogo-lotes-${sufijo}`,
    role: 'trabajador',
    password: 'prueba-segura',
  })
  const token = await ApiToken.create({
    userId: user.id,
    type: 'api',
    token: `token-catalogo-lotes-${sufijo}`,
    expiresAt: null,
    createdAt: DateTime.now(),
  })

  return `Bearer ${token.token}`
}

async function crearCliente() {
  const sufijo = randomUUID()
  return Client.create({
    nombres: 'Cliente catalogo',
    apellidos: 'Lotes',
    telefono: sufijo.slice(0, 12),
    direccion: 'Direccion de prueba',
    zona: null,
    activo: true,
  })
}

async function crearLote(etiqueta: string, estado = 'disponible', habilitadoVenta?: boolean) {
  const sufijo = randomUUID().slice(0, 8)
  return Lote.create({
    numero: `${etiqueta}-${sufijo}`,
    medida: `10 x 20 ${etiqueta}`,
    area: `200 ${etiqueta}`,
    estado,
    ...(habilitadoVenta === undefined ? {} : { habilitadoVenta }),
  })
}

async function crearVenta(clienteId: number, loteId: number | null, estado = 'activo') {
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

function buscarLote(lotes: LoteCatalogo[], loteId: number) {
  return lotes.find((lote) => lote.loteId === loteId)
}

test.group('Catalogo autoritativo de lotes', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('GET /api/lotes requiere autenticacion', async ({ client }) => {
    const response = await client.get('/api/lotes')

    response.assertStatus(401)
  })

  test('exige autorizacion comercial y deriva ocupacion de ventas activas', async ({
    client,
    assert,
  }) => {
    const authorization = await crearSesion()
    const cliente = await crearCliente()
    const disponible = await crearLote('DISPONIBLE', 'vendido', true)
    const noAutorizado = await crearLote('NO-AUTORIZADO')
    const ocupadoPredio = await crearLote('OCUPADO-PREDIO')
    const ocupadoLegacy = await crearLote('OCUPADO-LEGACY')
    const conflicto = await crearLote('CONFLICTO')
    const cancelado = await crearLote('CANCELADO', 'vendido', true)

    const ventaPredios = await crearVenta(cliente.id, disponible.id)
    await VentaPredio.create({ ventaId: ventaPredios.id, loteId: ocupadoPredio.id, precio: null })
    await crearVenta(cliente.id, ocupadoLegacy.id)

    const conflictoUno = await crearVenta(cliente.id, null)
    const conflictoDos = await crearVenta(cliente.id, null)
    await VentaPredio.createMany([
      { ventaId: conflictoUno.id, loteId: conflicto.id, precio: null },
      { ventaId: conflictoDos.id, loteId: conflicto.id, precio: null },
    ])

    const ventaCancelada = await crearVenta(cliente.id, null, 'cancelado')
    await VentaPredio.create({ ventaId: ventaCancelada.id, loteId: cancelado.id, precio: null })

    const response = await client.get('/api/lotes').header('authorization', authorization)
    response.assertStatus(200)
    const lotes = response.body().lotes as LoteCatalogo[]

    const loteDisponible = buscarLote(lotes, disponible.id)
    assert.deepInclude(loteDisponible!, {
      loteId: disponible.id,
      numero: disponible.numero,
      area: disponible.area,
      medida: disponible.medida,
      habilitadoVenta: true,
      estadoDisponibilidad: 'disponible',
      disponible: true,
      cantidadVentasActivas: 0,
    })
    assert.deepInclude(buscarLote(lotes, noAutorizado.id)!, {
      habilitadoVenta: false,
      estadoDisponibilidad: 'no_autorizado',
      disponible: false,
      cantidadVentasActivas: 0,
    })
    assert.deepInclude(buscarLote(lotes, ocupadoPredio.id)!, {
      habilitadoVenta: false,
      estadoDisponibilidad: 'ocupado',
      disponible: false,
      cantidadVentasActivas: 1,
    })
    assert.deepInclude(buscarLote(lotes, ocupadoLegacy.id)!, {
      estadoDisponibilidad: 'ocupado',
      disponible: false,
      cantidadVentasActivas: 1,
    })
    assert.deepInclude(buscarLote(lotes, conflicto.id)!, {
      estadoDisponibilidad: 'conflicto',
      disponible: false,
      cantidadVentasActivas: 2,
    })
    assert.deepInclude(buscarLote(lotes, cancelado.id)!, {
      habilitadoVenta: true,
      estadoDisponibilidad: 'disponible',
      disponible: true,
      cantidadVentasActivas: 0,
    })

    await noAutorizado.refresh()
    assert.isFalse(noAutorizado.habilitadoVenta)
  })
})
