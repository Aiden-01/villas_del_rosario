import { test } from '@japa/runner'
import { validarPermisoBackfill } from '#services/local_financiero_guard'

const produccion = {
  NODE_ENV: 'production',
  DB_HOST: 'db.production.internal',
  DB_PORT: 5432,
  DB_DATABASE: 'villas_del_rosario',
}

test.group('Proteccion de financiero:backfill', () => {
  test('rechaza production sin confirmacion explicita', ({ assert }) => {
    assert.throws(() => validarPermisoBackfill(produccion), /--confirm-production/)
  })

  test('acepta production solo con confirmacion explicita', ({ assert }) => {
    assert.deepEqual(validarPermisoBackfill(produccion, true), produccion)
  })
})
