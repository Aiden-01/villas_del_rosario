import { test } from '@japa/runner'
import Prestamo from '#models/prestamo'
import {
  calcularPlanCuotas,
  calcularMontoFinanciado,
  calcularEnganchePagado,
  resumenCuotasVenta,
} from '#services/cuotas_ventas_service'

test.group('Motor Financiero - Plan Contractual y Redondeo', () => {
  test('Caso 16: Venta cuyo monto no divide exacto entre cuotas absorbe centavos en la ultima cuota', ({
    assert,
  }) => {
    // 100,000 / 3 = 33,333.33...
    const ventaMock = {
      monto: 100000,
      cuotas: 3,
      pagos: [],
    } as unknown as Prestamo

    const plan = calcularPlanCuotas(ventaMock)

    assert.equal(plan.length, 3)
    assert.equal(plan[0].monto, 33333.33)
    assert.equal(plan[1].monto, 33333.33)
    assert.equal(plan[2].monto, 33333.34) // Absorbe el centavo de diferencia

    const sumaExacta = plan.reduce((acc, c) => acc + c.monto, 0)
    assert.equal(Number(sumaExacta.toFixed(2)), 100000)
  })

  test('Caso 16b: Plan de cuotas con enganche previo', ({ assert }) => {
    // Venta Q120,000 con Q20,000 de enganche y 20 cuotas
    const ventaMock = {
      monto: 120000,
      cuotas: 20,
      pagos: [
        {
          numeroCuota: 0,
          montoPagado: 20000,
          tipoPago: 'enganche',
          anulado: false,
        },
      ],
    } as unknown as Prestamo

    assert.equal(calcularEnganchePagado(ventaMock), 20000)
    assert.equal(calcularMontoFinanciado(ventaMock), 100000)

    const plan = calcularPlanCuotas(ventaMock)
    assert.equal(plan.length, 20)
    assert.equal(plan[0].monto, 5000)
    assert.equal(plan[19].monto, 5000)

    const sumaExacta = plan.reduce((acc, c) => acc + c.monto, 0)
    assert.equal(Number(sumaExacta.toFixed(2)), 100000)
  })

  test('Caso 1: Cobertura de cuotas con pago que cubre varias cuotas y fraccion (Q12,000 en 20 de Q5,000)', ({
    assert,
  }) => {
    // Q100,000 financiado, 20 cuotas de Q5,000. Pago histórico de Q12,000.
    const ventaMock = {
      monto: 100000,
      cuotas: 20,
      pagos: [
        {
          numeroCuota: 1,
          montoPagado: 5000,
          tipoPago: 'cuota',
          anulado: false,
        },
        {
          numeroCuota: 2,
          montoPagado: 5000,
          tipoPago: 'cuota',
          anulado: false,
        },
        {
          numeroCuota: 3,
          montoPagado: 2000,
          tipoPago: 'cuota',
          anulado: false,
        },
      ],
    } as unknown as Prestamo

    const resumen = resumenCuotasVenta(ventaMock)

    assert.equal(resumen.cuotasPagadas, 2)
    assert.equal(resumen.proximaCuota, 3)
    assert.equal(resumen.montoPendienteCuota, 3000)
    assert.equal(resumen.saldoPendiente, 88000)
    assert.equal(resumen.totalPagado, 12000)
  })

  test('Caso 2: Pago adicional de Q8,000 completa cuota 3 y paga cuota 4', ({ assert }) => {
    const ventaMock = {
      monto: 100000,
      cuotas: 20,
      pagos: [
        { numeroCuota: 1, montoPagado: 5000, tipoPago: 'cuota', anulado: false },
        { numeroCuota: 2, montoPagado: 5000, tipoPago: 'cuota', anulado: false },
        { numeroCuota: 3, montoPagado: 2000, tipoPago: 'cuota', anulado: false },
        // Segundo pago aplicado
        { numeroCuota: 3, montoPagado: 3000, tipoPago: 'cuota', anulado: false },
        { numeroCuota: 4, montoPagado: 5000, tipoPago: 'cuota', anulado: false },
      ],
    } as unknown as Prestamo

    const resumen = resumenCuotasVenta(ventaMock)

    assert.equal(resumen.cuotasPagadas, 4)
    assert.equal(resumen.proximaCuota, 5)
    assert.equal(resumen.montoPendienteCuota, 5000)
    assert.equal(resumen.saldoPendiente, 80000)
    assert.equal(resumen.totalPagado, 20000)
  })

  test('Caso 3: Pago inicial de Q2,000 deja cuota 1 parcial con Q3,000 pendiente', ({ assert }) => {
    const ventaMock = {
      monto: 100000,
      cuotas: 20,
      pagos: [{ numeroCuota: 1, montoPagado: 2000, tipoPago: 'cuota', anulado: false }],
    } as unknown as Prestamo

    const resumen = resumenCuotasVenta(ventaMock)

    assert.equal(resumen.cuotasPagadas, 0)
    assert.equal(resumen.proximaCuota, 1)
    assert.equal(resumen.montoPendienteCuota, 3000)
    assert.equal(resumen.saldoPendiente, 98000)
  })

  test('Caso 4: Pago cubre exactamente saldo final y saldo llega a 0.00', ({ assert }) => {
    const ventaMock = {
      monto: 10000,
      cuotas: 2,
      pagos: [
        { numeroCuota: 1, montoPagado: 5000, tipoPago: 'cuota', anulado: false },
        { numeroCuota: 2, montoPagado: 5000, tipoPago: 'cuota', anulado: false },
      ],
    } as unknown as Prestamo

    const resumen = resumenCuotasVenta(ventaMock)

    assert.equal(resumen.cuotasPagadas, 2)
    assert.isNull(resumen.proximaCuota)
    assert.equal(resumen.montoPendienteCuota, 0)
    assert.equal(resumen.saldoPendiente, 0)
  })

  test('Caso 10: Pagos con anulado=true no afectan cuotas ni saldo', ({ assert }) => {
    const ventaMock = {
      monto: 100000,
      cuotas: 20,
      pagos: [
        // Pago 1 anulado
        { numeroCuota: 1, montoPagado: 5000, tipoPago: 'cuota', anulado: true },
        // Pago 2 activo
        { numeroCuota: 1, montoPagado: 5000, tipoPago: 'cuota', anulado: false },
        // Pago 3 activo
        { numeroCuota: 2, montoPagado: 5000, tipoPago: 'cuota', anulado: false },
      ],
    } as unknown as Prestamo

    const resumen = resumenCuotasVenta(ventaMock)

    // Solo 2 cuotas cubiertas (Q10,000 en vez de Q15,000)
    assert.equal(resumen.cuotasPagadas, 2)
    assert.equal(resumen.proximaCuota, 3)
    assert.equal(resumen.totalPagado, 10000)
    assert.equal(resumen.saldoPendiente, 90000)
  })
})
