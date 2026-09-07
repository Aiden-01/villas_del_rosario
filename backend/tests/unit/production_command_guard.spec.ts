import { test } from '@japa/runner'
import { verificarComandoSeguroEnProduccion } from '#services/production_command_guard'

test.group('Proteccion de comandos destructivos en production', () => {
  for (const comando of [
    'db:seed',
    'db:truncate',
    'db:wipe',
    'migration:fresh',
    'migration:reset',
    'migration:refresh',
  ]) {
    test(`rechaza ${comando}`, ({ assert }) => {
      assert.throws(
        () => verificarComandoSeguroEnProduccion([comando, '--force'], 'production'),
        /prohibido en production/
      )
    })
  }

  test('permite migration:run y financiero:backfill', ({ assert }) => {
    assert.doesNotThrow(() =>
      verificarComandoSeguroEnProduccion(['migration:run', '--force'], 'production')
    )
    assert.doesNotThrow(() =>
      verificarComandoSeguroEnProduccion(
        ['financiero:backfill', '--confirm-production'],
        'production'
      )
    )
  })
})
