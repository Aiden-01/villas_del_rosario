import { test } from '@japa/runner'
import { updateVentaValidator } from '#validators/ventas_validator'

test.group('Update venta validator', () => {
  test('acepta cambiar el cliente asignado', async ({ assert }) => {
    const data = await updateVentaValidator.validate({ clienteId: 42 })

    assert.equal(data.clienteId, 42)
  })
})
