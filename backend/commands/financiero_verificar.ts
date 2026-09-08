import { verificarPermisoVerificacion } from '#services/local_financiero_guard'
import { BaseCommand, flags } from '@adonisjs/core/ace'
import { CommandOptions } from '@adonisjs/core/types/ace'
import db from '@adonisjs/lucid/services/db'

export default class FinancieroVerificar extends BaseCommand {
  static commandName = 'financiero:verificar'
  static description = 'Auditor pre/post migracion del sistema financiero'

  static options: CommandOptions = {
    startApp: true,
  }

  @flags.boolean({ description: 'Incluir verificacion de pago_aplicaciones (post-backfill)' })
  declare conAplicaciones: boolean

  @flags.boolean({
    description: 'Confirma explicitamente la ejecucion cuando NODE_ENV=production',
  })
  declare confirmProduction: boolean

  async run() {
    this.logger.info(JSON.stringify(verificarPermisoVerificacion(this.confirmProduction)))
    this.logger.info('====== VERIFICADOR FINANCIERO VILLAS DEL ROSARIO ======')
    let hayErroresGraves = false

    // ---- Conteos basicos ----
    const clientes = await db.rawQuery('SELECT COUNT(*) as total FROM clientes')
    const clientesActivos = await db.rawQuery(
      'SELECT COUNT(*) as total FROM clientes WHERE activo = true'
    )
    const ventas = await db.rawQuery('SELECT COUNT(*) as total FROM ventas')
    const pagos = await db.rawQuery('SELECT COUNT(*) as total FROM pagos')
    const pagosAnulados = await db.rawQuery(
      'SELECT COUNT(*) as total FROM pagos WHERE anulado = true'
    )
    const sumaPagos = await db.rawQuery(
      'SELECT COALESCE(SUM(monto_pagado), 0) as suma FROM pagos WHERE anulado = false'
    )
    const enganches = await db.rawQuery(
      "SELECT COUNT(*) as total FROM pagos WHERE tipo_pago = 'enganche' AND anulado = false"
    )
    const pagosNormales = await db.rawQuery(
      "SELECT COUNT(*) as total FROM pagos WHERE tipo_pago != 'enganche' AND anulado = false"
    )

    this.logger.info('')
    this.logger.info('--- CONTEOS GENERALES ---')
    this.logger.info(`  Clientes totales: ${clientes.rows[0]?.total ?? 0}`)
    this.logger.info(`  Clientes activos: ${clientesActivos.rows[0]?.total ?? 0}`)
    this.logger.info(`  Ventas totales: ${ventas.rows[0]?.total ?? 0}`)
    this.logger.info(`  Pagos totales: ${pagos.rows[0]?.total ?? 0}`)
    this.logger.info(`  Pagos anulados: ${pagosAnulados.rows[0]?.total ?? 0}`)
    this.logger.info(`  Enganches validos: ${enganches.rows[0]?.total ?? 0}`)
    this.logger.info(`  Pagos normales validos: ${pagosNormales.rows[0]?.total ?? 0}`)
    this.logger.info(
      `  Suma total historica (sin anulados): Q${Number(sumaPagos.rows[0]?.suma ?? 0).toFixed(2)}`
    )

    // ---- Ventas con problemas ----
    const ventasSinCliente = await db.rawQuery(
      'SELECT COUNT(*) as total FROM ventas WHERE cliente_id NOT IN (SELECT id FROM clientes)'
    )
    const pagosHuerfanos = await db.rawQuery(
      'SELECT COUNT(*) as total FROM pagos WHERE venta_id NOT IN (SELECT id FROM ventas)'
    )
    const ventasConSaldoNegativo = await db.rawQuery(`
      SELECT COUNT(*) as total FROM (
        SELECT v.id, v.monto,
          COALESCE(SUM(p.monto_pagado), 0) as total_pagado,
          v.monto - COALESCE(SUM(p.monto_pagado), 0) as saldo
        FROM ventas v
        LEFT JOIN pagos p ON p.venta_id = v.id AND p.anulado = false
        GROUP BY v.id, v.monto
        HAVING v.monto - COALESCE(SUM(p.monto_pagado), 0) < -0.01
      ) sub
    `)
    const ventasConExceso = await db.rawQuery(`
      SELECT COUNT(*) as total FROM (
        SELECT v.id,
          COALESCE(SUM(p.monto_pagado), 0) as total_pagado,
          v.monto
        FROM ventas v
        LEFT JOIN pagos p ON p.venta_id = v.id AND p.anulado = false
        GROUP BY v.id
        HAVING COALESCE(SUM(p.monto_pagado), 0) > v.monto + 0.01
      ) sub
    `)

    this.logger.info('')
    this.logger.info('--- PROBLEMAS POTENCIALES ---')

    const sinCliente = Number(ventasSinCliente.rows[0]?.total || 0)
    if (sinCliente > 0) {
      this.logger.error(`  ❌ Ventas sin cliente valido: ${sinCliente}`)
      hayErroresGraves = true
    } else {
      this.logger.success('  ✅ Sin ventas huerfanas (sin cliente)')
    }

    const huerfanos = Number(pagosHuerfanos.rows[0]?.total || 0)
    if (huerfanos > 0) {
      this.logger.error(`  ❌ Pagos huerfanos (sin venta): ${huerfanos}`)
      hayErroresGraves = true
    } else {
      this.logger.success('  ✅ Sin pagos huerfanos')
    }

    const saldoNeg = Number(ventasConSaldoNegativo.rows[0]?.total || 0)
    if (saldoNeg > 0) {
      this.logger.error(`  ❌ Ventas con saldo negativo: ${saldoNeg}`)
      hayErroresGraves = true
    } else {
      this.logger.success('  ✅ Sin ventas con saldo negativo')
    }

    const conExceso = Number(ventasConExceso.rows[0]?.total || 0)
    if (conExceso > 0) {
      this.logger.warning(`  ⚠️  Ventas donde suma de pagos > precio: ${conExceso}`)
    } else {
      this.logger.success('  ✅ Sin ventas con pagos que excedan el precio')
    }

    // ---- Post-backfill (solo si flag activo) ----
    if (this.conAplicaciones) {
      this.logger.info('')
      this.logger.info('--- VERIFICACION pago_aplicaciones ---')

      try {
        const totalAplic = await db.rawQuery('SELECT COUNT(*) as total FROM pago_aplicaciones')
        const sumAplic = await db.rawQuery(
          'SELECT COALESCE(SUM(monto_aplicado), 0) as suma FROM pago_aplicaciones'
        )
        const aplicHuerfanas = await db.rawQuery(
          'SELECT COUNT(*) as total FROM pago_aplicaciones WHERE pago_id NOT IN (SELECT id FROM pagos)'
        )
        const aplicNegativas = await db.rawQuery(
          'SELECT COUNT(*) as total FROM pago_aplicaciones WHERE monto_aplicado <= 0'
        )

        this.logger.info(`  Total aplicaciones: ${totalAplic.rows[0]?.total ?? 0}`)
        this.logger.info(
          `  Suma total aplicada: Q${Number(sumAplic.rows[0]?.suma ?? 0).toFixed(2)}`
        )

        const apHuerfanas = Number(aplicHuerfanas.rows[0]?.total || 0)
        if (apHuerfanas > 0) {
          this.logger.error(`  ❌ Aplicaciones huerfanas: ${apHuerfanas}`)
          hayErroresGraves = true
        } else {
          this.logger.success('  ✅ Sin aplicaciones huerfanas')
        }

        const apNeg = Number(aplicNegativas.rows[0]?.total || 0)
        if (apNeg > 0) {
          this.logger.error(`  ❌ Aplicaciones con monto <= 0: ${apNeg}`)
          hayErroresGraves = true
        } else {
          this.logger.success('  ✅ Sin aplicaciones con monto invalido')
        }
      } catch {
        this.logger.warning(
          '  Tabla pago_aplicaciones no existe todavia. Ejecutar migraciones primero.'
        )
      }
    }

    this.logger.info('')
    this.logger.info('======================================================')
    if (hayErroresGraves) {
      this.logger.error(
        'RESULTADO: Se encontraron errores graves. Revisar antes de hacer backfill.'
      )
      this.exitCode = 1
    } else {
      this.logger.success('RESULTADO: Verificacion completada sin errores graves.')
    }
  }
}
