import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import Prestamo from '#models/prestamo'
import ProgramacionPago from '#models/programacion_pago'
import { calcularMora } from '#services/mora_service'

test.group('Motor de Mora y Fechas Efectivas', () => {
  test('Caso 6: Cuota que vencio el dia 5 y hoy es dia 20 se detecta en mora', ({ assert }) => {
    const hace15Dias = DateTime.now().setZone('America/Guatemala').minus({ days: 15 }).toISODate()

    const ventaMock = {
      monto: 50000,
      cuotas: 10,
      fechaInicio: DateTime.fromISO(hace15Dias!),
      fechaCobro: DateTime.fromISO(hace15Dias!),
      pagos: [],
    } as unknown as Prestamo

    const mora = calcularMora(ventaMock, [])

    assert.isTrue(mora.enMora)
    assert.isAtLeast(mora.diasAtraso, 14)
    assert.equal(mora.fechaContractual, hace15Dias)
    assert.equal(mora.fechaEfectiva, hace15Dias)
  })

  test('Caso 8: Cuota vencida reprogramada a fecha futura ya no aparece en mora', ({ assert }) => {
    const hace15Dias = DateTime.now().setZone('America/Guatemala').minus({ days: 15 }).toISODate()
    const en5Dias = DateTime.now().setZone('America/Guatemala').plus({ days: 5 }).toISODate()

    const ventaMock = {
      monto: 50000,
      cuotas: 10,
      fechaInicio: DateTime.fromISO(hace15Dias!),
      fechaCobro: DateTime.fromISO(hace15Dias!),
      pagos: [],
    } as unknown as Prestamo

    const programacionesMock = [
      {
        numeroCuota: 1,
        fechaProgramada: DateTime.fromISO(en5Dias!),
        resuelto: false,
        createdAt: DateTime.now(),
      } as unknown as ProgramacionPago,
    ]

    const mora = calcularMora(ventaMock, programacionesMock)

    assert.isFalse(mora.enMora)
    assert.equal(mora.diasAtraso, 0)
    assert.equal(mora.fechaContractual, hace15Dias)
    assert.equal(mora.fechaEfectiva, en5Dias)
  })

  test('Caso 9: Pago parcial de cuota vencida sigue marcando cuota pendiente en mora por saldo restante', ({
    assert,
  }) => {
    const hace10Dias = DateTime.now().setZone('America/Guatemala').minus({ days: 10 }).toISODate()

    const ventaMock = {
      monto: 50000,
      cuotas: 10,
      fechaInicio: DateTime.fromISO(hace10Dias!),
      fechaCobro: DateTime.fromISO(hace10Dias!),
      // Pago parcial de Q2,000 en cuota de Q5,000
      pagos: [
        {
          numeroCuota: 1,
          montoPagado: 2000,
          tipoPago: 'cuota',
          anulado: false,
        },
      ],
    } as unknown as Prestamo

    const mora = calcularMora(ventaMock, [])

    assert.isTrue(mora.enMora)
    assert.isAtLeast(mora.diasAtraso, 9)
  })
})
