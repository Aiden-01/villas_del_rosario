import { test } from '@japa/runner'
import {
  validarPermisoBackfill,
  validarPermisoVerificacion,
} from '#services/local_financiero_guard'

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

test.group('Proteccion de financiero:verificar', () => {
  test('rechaza production sin confirmacion explicita', ({ assert }) => {
    assert.throws(() => validarPermisoVerificacion(produccion), /--confirm-production/)
  })

  test('acepta production solo con confirmacion explicita', ({ assert }) => {
    assert.deepEqual(validarPermisoVerificacion(produccion, true), produccion)
  })

  test('conserva las restricciones de entorno local en development y test', ({ assert }) => {
    const desarrollo = {
      NODE_ENV: 'development',
      DB_HOST: '127.0.0.1',
      DB_PORT: 5435,
      DB_DATABASE: 'villas_del_rosario_dev',
    }
    const pruebas = {
      NODE_ENV: 'test',
      DB_HOST: 'localhost',
      DB_PORT: 5435,
      DB_DATABASE: 'villas_del_rosario_test',
    }

    assert.deepEqual(validarPermisoVerificacion(desarrollo), desarrollo)
    assert.deepEqual(validarPermisoVerificacion(pruebas), pruebas)
  })

  test('rechaza destinos no locales fuera de production', ({ assert }) => {
    const desarrolloLocal = {
      NODE_ENV: 'development',
      DB_HOST: '127.0.0.1',
      DB_PORT: 5435,
      DB_DATABASE: 'villas_del_rosario_dev',
    }
    const destinosBloqueados = [
      { ...desarrolloLocal, NODE_ENV: 'staging' },
      { ...desarrolloLocal, DB_HOST: 'db.production.internal' },
      { ...desarrolloLocal, DB_PORT: 5432 },
      { ...desarrolloLocal, DB_DATABASE: 'villas_del_rosario' },
    ]

    for (const entorno of destinosBloqueados) {
      assert.throws(() => validarPermisoVerificacion(entorno), /bases locales dev\/test/)
    }
  })
})
