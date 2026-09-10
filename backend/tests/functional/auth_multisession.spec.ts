import { randomUUID } from 'node:crypto'
import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { DateTime } from 'luxon'
import ApiToken from '#models/api_token'
import User from '#models/user'

test.group('Sesiones multidispositivo', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('login, refresh y logout afectan solamente la sesion presentada', async ({
    client,
    assert,
  }) => {
    const unique = randomUUID().replace(/-/g, '')
    const credentials = {
      username: `multi-${unique.slice(0, 12)}`,
      password: 'prueba-multidispositivo',
    }
    const user = await User.create({
      name: 'Usuario multidispositivo',
      email: `multi-${unique}@example.com`,
      username: credentials.username,
      role: 'trabajador',
      password: credentials.password,
    })
    const legacyToken = await ApiToken.create({
      userId: user.id,
      type: 'api',
      token: `legacy-${unique}`,
      expiresAt: null,
      createdAt: DateTime.now(),
    })

    const loginA = await client.post('/api/login').json(credentials)
    loginA.assertStatus(200)
    const sessionA = loginA.body()

    const loginB = await client.post('/api/login').json(credentials)
    loginB.assertStatus(200)
    const sessionB = loginB.body()

    await client
      .get('/api/clientes')
      .header('authorization', `Bearer ${sessionA.token}`)
      .then((response) => response.assertStatus(200))
    await client
      .get('/api/clientes')
      .header('authorization', `Bearer ${sessionB.token}`)
      .then((response) => response.assertStatus(200))
    await client
      .get('/api/clientes')
      .header('authorization', `Bearer ${legacyToken.token}`)
      .then((response) => response.assertStatus(200))

    const refreshA = await client
      .post('/api/refresh')
      .header('authorization', `Bearer ${sessionA.token}`)
      .json({ refreshToken: sessionA.refreshToken })
    refreshA.assertStatus(200)
    const refreshedSessionA = refreshA.body()

    assert.notEqual(refreshedSessionA.token, sessionA.token)
    assert.notEqual(refreshedSessionA.refreshToken, sessionA.refreshToken)
    await client
      .get('/api/clientes')
      .header('authorization', `Bearer ${sessionA.token}`)
      .then((response) => response.assertStatus(401))
    await client
      .get('/api/clientes')
      .header('authorization', `Bearer ${sessionB.token}`)
      .then((response) => response.assertStatus(200))

    const logoutA = await client
      .post('/api/logout')
      .header('authorization', `Bearer ${refreshedSessionA.token}`)
      .json({ refreshToken: refreshedSessionA.refreshToken })
    logoutA.assertStatus(200)

    await client
      .get('/api/clientes')
      .header('authorization', `Bearer ${refreshedSessionA.token}`)
      .then((response) => response.assertStatus(401))
    await client
      .post('/api/refresh')
      .json({ refreshToken: refreshedSessionA.refreshToken })
      .then((response) => response.assertStatus(401))
    await client
      .get('/api/clientes')
      .header('authorization', `Bearer ${sessionB.token}`)
      .then((response) => response.assertStatus(200))

    const refreshB = await client
      .post('/api/refresh')
      .header('authorization', `Bearer ${sessionB.token}`)
      .json({ refreshToken: sessionB.refreshToken })
    refreshB.assertStatus(200)

    await client
      .get('/api/clientes')
      .header('authorization', `Bearer ${sessionB.token}`)
      .then((response) => response.assertStatus(401))
    await client
      .get('/api/clientes')
      .header('authorization', `Bearer ${refreshB.body().token}`)
      .then((response) => response.assertStatus(200))
    await client
      .get('/api/clientes')
      .header('authorization', `Bearer ${legacyToken.token}`)
      .then((response) => response.assertStatus(200))
  })

  test('un access token inexistente responde 401', async ({ client }) => {
    const response = await client
      .get('/api/clientes')
      .header('authorization', 'Bearer token-inexistente')

    response.assertStatus(401)
  })
})
