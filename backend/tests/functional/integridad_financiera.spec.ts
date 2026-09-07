import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { DateTime } from 'luxon'
import ApiToken from '#models/api_token'
import Client from '#models/client'
import Pago from '#models/pago'
import PagoAplicacion from '#models/pago_aplicacion'
import Prestamo from '#models/prestamo'
import User from '#models/user'
import { reconstruirAplicacionesVenta } from '#services/reconstruir_aplicaciones_service'
import { validarPermisoBackfill } from '#services/local_financiero_guard'

async function crearSesionAdmin(prefijo: string) {
  const unique = `${prefijo}-${Date.now()}-${Math.random()}`
  const user = await User.create({
    name: 'Administrador de prueba',
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

async function crearCliente(sufijo: string, activo = true) {
  return Client.create({
    nombres: `Cliente ${sufijo}`,
    apellidos: 'Prueba',
    telefono: `5555${Math.floor(Math.random() * 8999 + 1000)}`,
    direccion: 'Direccion de prueba',
    zona: null,
    activo,
  })
}

async function crearVenta(clienteId: number, datos: Partial<Prestamo> = {}) {
  return Prestamo.create({
    clienteId,
    loteId: null,
    monto: 100,
    cuotas: 1,
    fechaInicio: DateTime.now().minus({ months: 1 }),
    fechaFin: DateTime.now().plus({ years: 1 }),
    estado: 'activo',
    frecuenciaPago: 'mensual',
    fechaCobro: DateTime.now(),
    ...datos,
  })
}

test.group('Integridad financiera y bajas logicas', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('POST /api/pagos/:id/anular exige motivo, conserva el pago y reactiva la venta pagada', async ({
    client,
    assert,
  }) => {
    const { user, authorization } = await crearSesionAdmin('anular')
    const cliente = await crearCliente('Anulacion')
    const venta = await crearVenta(cliente.id, {
      estado: 'pagado',
      monto: 200,
      cuotas: 2,
    } as Partial<Prestamo>)
    const pagoVigente = await Pago.create({
      prestamoId: venta.id,
      usuarioId: user.id,
      numeroCuota: 1,
      montoPagado: 100,
      tipoPago: 'cuota',
      fechaPago: DateTime.now(),
      anulado: false,
    })
    await PagoAplicacion.create({
      pagoId: pagoVigente.id,
      ventaId: venta.id,
      numeroCuota: 1,
      montoAplicado: 100,
    })
    const pago = await Pago.create({
      prestamoId: venta.id,
      usuarioId: user.id,
      numeroCuota: 2,
      montoPagado: 100,
      tipoPago: 'cuota',
      fechaPago: DateTime.now(),
      anulado: false,
    })
    await PagoAplicacion.create({
      pagoId: pago.id,
      ventaId: venta.id,
      numeroCuota: 2,
      montoAplicado: 100,
    })

    const sinMotivo = await client
      .post(`/api/pagos/${pago.id}/anular`)
      .header('authorization', authorization)
      .json({})
    sinMotivo.assertStatus(400)

    const response = await client
      .post(`/api/pagos/${pago.id}/anular`)
      .header('authorization', authorization)
      .json({ motivo: 'Registro duplicado' })
    response.assertStatus(200)
    response.assertBodyContains({
      venta: { id: venta.id, estado: 'activo', saldoPendiente: 100, cuotasPagadas: 1 },
    })

    await pago.refresh()
    await venta.refresh()
    assert.isTrue(pago.anulado)
    assert.equal(pago.motivoAnulacion, 'Registro duplicado')
    assert.equal(venta.estado, 'activo')
    assert.equal(
      await Pago.query()
        .where('id', pago.id)
        .count('* as total')
        .first()
        .then((r) => Number(r?.$extras.total)),
      1
    )
    assert.equal(
      await PagoAplicacion.query()
        .where('pago_id', pago.id)
        .count('* as total')
        .first()
        .then((r) => Number(r?.$extras.total)),
      0
    )
    assert.equal(
      await PagoAplicacion.query()
        .where('pago_id', pagoVigente.id)
        .count('* as total')
        .first()
        .then((r) => Number(r?.$extras.total)),
      1
    )

    const pagosOperativos = await client
      .get(`/api/pagos/venta/${venta.id}`)
      .header('authorization', authorization)
    pagosOperativos.assertStatus(200)
    const pagoAnuladoEnHistorial = pagosOperativos.body().find((item: any) => item.id === pago.id)
    assert.isTrue(pagoAnuladoEnHistorial.anulado)
    assert.equal(pagoAnuladoEnHistorial.motivoAnulacion, 'Registro duplicado')
  })

  test('cancelar venta exige motivo y conserva venta y pagos', async ({ client, assert }) => {
    const { user, authorization } = await crearSesionAdmin('cancelar')
    const cliente = await crearCliente('Cancelacion')
    const venta = await crearVenta(cliente.id)
    const pago = await Pago.create({
      prestamoId: venta.id,
      usuarioId: user.id,
      numeroCuota: 1,
      montoPagado: 25,
      tipoPago: 'cuota',
      fechaPago: DateTime.now(),
      anulado: false,
    })

    const sinMotivo = await client
      .delete(`/api/ventas/${venta.id}`)
      .header('authorization', authorization)
      .json({})
    sinMotivo.assertStatus(400)

    const response = await client
      .delete(`/api/ventas/${venta.id}`)
      .header('authorization', authorization)
      .json({ motivo: 'Rescision solicitada' })
    response.assertStatus(200)

    await venta.refresh()
    assert.equal(venta.estado, 'cancelado')
    assert.equal(venta.motivoCancelacion, 'Rescision solicitada')
    assert.isNotNull(await Pago.find(pago.id))
    assert.isNotNull(await Prestamo.find(venta.id))
  })

  test('agenda separa atrasados, hoy y proximos sin repetir ventas', async ({ client, assert }) => {
    const { authorization } = await crearSesionAdmin('agenda')
    const hoy = DateTime.now().setZone('America/Guatemala').startOf('day')
    const fechaProxima = hoy.plus({ months: 1 }).startOf('month').plus({ days: 9 })
    const clienteAtrasado = await crearCliente('Atrasado')
    const clienteHoy = await crearCliente('Hoy')
    const clienteProximo = await crearCliente('Proximo')
    const atrasada = await crearVenta(clienteAtrasado.id, {
      fechaCobro: hoy.minus({ months: 2 }),
    } as Partial<Prestamo>)
    const actual = await crearVenta(clienteHoy.id, { fechaCobro: hoy } as Partial<Prestamo>)
    const proxima = await crearVenta(clienteProximo.id, {
      fechaCobro: fechaProxima,
    } as Partial<Prestamo>)

    const response = await client
      .get(`/api/pagos/calendario?mes=${fechaProxima.toFormat('yyyy-MM')}`)
      .header('authorization', authorization)
    response.assertStatus(200)

    const body = response.body()
    assert.include(
      body.atrasados.map((item: any) => item.prestamoId),
      atrasada.id
    )
    assert.include(
      body.hoyItems.map((item: any) => item.prestamoId),
      actual.id
    )
    assert.include(
      body.grupos.flatMap((grupo: any) => grupo.items.map((item: any) => item.prestamoId)),
      proxima.id
    )
    const ids = [
      ...body.atrasados,
      ...body.hoyItems,
      ...body.grupos.flatMap((grupo: any) => grupo.items),
    ].map((item: any) => item.prestamoId)
    assert.lengthOf(new Set(ids), ids.length)
  })

  test('clientes inactivos se ocultan por defecto y el admin puede solicitarlos', async ({
    client,
    assert,
  }) => {
    const { authorization } = await crearSesionAdmin('clientes')
    const activo = await crearCliente('Activo')
    const inactivo = await crearCliente('Inactivo')
    const venta = await crearVenta(inactivo.id)
    const pago = await Pago.create({
      prestamoId: venta.id,
      usuarioId: null,
      numeroCuota: 1,
      montoPagado: 10,
      tipoPago: 'cuota',
      fechaPago: DateTime.now(),
      anulado: false,
    })

    const desactivar = await client
      .delete(`/api/clientes/${inactivo.id}`)
      .header('authorization', authorization)
    desactivar.assertStatus(200)
    await inactivo.refresh()
    assert.isFalse(inactivo.activo)
    assert.isNotNull(await Prestamo.find(venta.id))
    assert.isNotNull(await Pago.find(pago.id))

    const normales = await client.get('/api/clientes').header('authorization', authorization)
    normales.assertStatus(200)
    assert.include(
      normales.body().map((item: any) => item.id),
      activo.id
    )
    assert.notInclude(
      normales.body().map((item: any) => item.id),
      inactivo.id
    )

    const todos = await client
      .get('/api/clientes?incluirInactivos=true')
      .header('authorization', authorization)
    todos.assertStatus(200)
    assert.include(
      todos.body().map((item: any) => item.id),
      inactivo.id
    )
  })

  test('backfill confirmado reconstruye aplicaciones sin modificar pagos originales', async ({
    assert,
  }) => {
    validarPermisoBackfill(
      {
        NODE_ENV: 'production',
        DB_HOST: 'db.production.internal',
        DB_PORT: 5432,
        DB_DATABASE: 'villas_del_rosario',
      },
      true
    )
    const { user } = await crearSesionAdmin('backfill')
    const cliente = await crearCliente('Backfill')
    const venta = await crearVenta(cliente.id)
    const pago = await Pago.create({
      prestamoId: venta.id,
      usuarioId: user.id,
      numeroCuota: 1,
      montoPagado: 40,
      tipoPago: 'cuota',
      fechaPago: DateTime.now(),
      anulado: false,
    })
    const original = {
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
    }

    await reconstruirAplicacionesVenta(venta.id)
    await pago.refresh()

    assert.deepEqual(
      {
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
      },
      original
    )
    const totalAplicaciones = await PagoAplicacion.query()
      .where('pago_id', pago.id)
      .count('* as total')
      .first()
      .then((r) => Number(r?.$extras.total))
    assert.isTrue(totalAplicaciones > 0)
  })
})
