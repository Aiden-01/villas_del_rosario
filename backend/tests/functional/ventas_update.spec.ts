import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { DateTime } from 'luxon'
import ApiToken from '#models/api_token'
import Client from '#models/client'
import Prestamo from '#models/prestamo'
import User from '#models/user'

test.group('PUT /api/ventas/:id', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('persiste el cambio de cliente de una venta', async ({ client, assert }) => {
    const unique = `${Date.now()}-${Math.random()}`
    const user = await User.create({
      name: 'Usuario de prueba',
      email: `ventas-${unique}@example.com`,
      username: `ventas-${unique}`,
      role: 'trabajador',
      password: 'prueba-segura',
    })
    const token = await ApiToken.create({
      userId: user.id,
      type: 'api',
      token: `token-${unique}`,
      expiresAt: null,
      createdAt: DateTime.now(),
    })
    const clienteActual = await Client.create({
      nombres: 'Emy',
      apellidos: 'Heredia',
      telefono: '55550001',
      direccion: 'Direccion de prueba',
      zona: null,
    })
    const clienteNuevo = await Client.create({
      nombres: 'Hugo',
      apellidos: 'Corado',
      telefono: '55550002',
      direccion: 'Direccion de prueba',
      zona: null,
    })
    const venta = await Prestamo.create({
      clienteId: clienteActual.id,
      loteId: null,
      monto: 100_000,
      cuotas: 24,
      fechaInicio: DateTime.fromISO('2026-01-01'),
      fechaFin: DateTime.fromISO('2028-01-01'),
      estado: 'activo',
      frecuenciaPago: 'mensual',
      fechaCobro: null,
    })

    const response = await client
      .put(`/api/ventas/${venta.id}`)
      .header('authorization', `Bearer ${token.token}`)
      .json({ clienteId: String(clienteNuevo.id) })

    response.assertStatus(200)
    response.assertBodyContains({
      prestamo: {
        id: venta.id,
        clienteId: clienteNuevo.id,
      },
    })

    await venta.refresh()
    assert.equal(venta.clienteId, clienteNuevo.id)
  })
})
