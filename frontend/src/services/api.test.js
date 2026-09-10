import test, { afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { authFetch } from './api.js'

const originalFetch = globalThis.fetch
const originalLocalStorage = globalThis.localStorage

afterEach(() => {
  globalThis.fetch = originalFetch
  if (originalLocalStorage === undefined) {
    delete globalThis.localStorage
  } else {
    globalThis.localStorage = originalLocalStorage
  }
})

function installLocalStorage(initialValues) {
  const values = new Map(Object.entries(initialValues))
  globalThis.localStorage = {
    getItem(key) {
      return values.has(key) ? values.get(key) : null
    },
    setItem(key, value) {
      values.set(key, String(value))
    },
    removeItem(key) {
      values.delete(key)
    },
  }
  return values
}

test('un 401 refresca usando solamente los tokens de la sesion local', async () => {
  const storage = installLocalStorage({
    token: 'access-a',
    refreshToken: 'refresh-a',
    user: JSON.stringify({ id: 1 }),
  })
  const calls = []

  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url, options })

    if (calls.length === 1) {
      assert.equal(options.headers.Authorization, 'Bearer access-a')
      return new Response('{}', { status: 401 })
    }

    if (calls.length === 2) {
      assert.equal(url, 'http://localhost:3333/api/refresh')
      assert.equal(options.headers.Authorization, 'Bearer access-a')
      assert.deepEqual(JSON.parse(options.body), { refreshToken: 'refresh-a' })
      return new Response(
        JSON.stringify({
          token: 'access-a-renovado',
          refreshToken: 'refresh-a-renovado',
          user: { id: 1 },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    assert.equal(options.headers.Authorization, 'Bearer access-a-renovado')
    return new Response('{}', { status: 200 })
  }

  const response = await authFetch('http://api.test/recurso')

  assert.equal(response.status, 200)
  assert.equal(calls.length, 3)
  assert.equal(storage.get('token'), 'access-a-renovado')
  assert.equal(storage.get('refreshToken'), 'refresh-a-renovado')
})

test('un 403 no refresca ni borra la autenticacion local', async () => {
  const storage = installLocalStorage({
    token: 'access-a',
    refreshToken: 'refresh-a',
    user: JSON.stringify({ id: 1 }),
  })
  let requests = 0
  globalThis.fetch = async () => {
    requests += 1
    return new Response('{}', { status: 403 })
  }

  const response = await authFetch('http://api.test/recurso')

  assert.equal(response.status, 403)
  assert.equal(requests, 1)
  assert.equal(storage.get('token'), 'access-a')
  assert.equal(storage.get('refreshToken'), 'refresh-a')
})

test('un error de red no borra la autenticacion local', async () => {
  const storage = installLocalStorage({
    token: 'access-a',
    refreshToken: 'refresh-a',
    user: JSON.stringify({ id: 1 }),
  })
  globalThis.fetch = async () => {
    throw new TypeError('Failed to fetch')
  }

  await assert.rejects(() => authFetch('http://api.test/recurso'), /Failed to fetch/)
  assert.equal(storage.get('token'), 'access-a')
  assert.equal(storage.get('refreshToken'), 'refresh-a')
})
