import { DateTime } from 'luxon'
import { notificarCobrosDelDia } from '../app/services/notificaciones_cobros_service.js'

const TZ = 'America/Guatemala'
const GUARD_KEY = Symbol.for('villas.cobros.notificaciones.started')

function boolEnv(name: string, defaultValue = false) {
  const value = process.env[name]
  if (value === undefined) return defaultValue
  return ['true', '1', 'yes', 'si'].includes(value.toLowerCase())
}

function minutosObjetivo() {
  const hour = Number(process.env.COBROS_NOTIFICACIONES_HORA || 7)
  const minute = Number(process.env.COBROS_NOTIFICACIONES_MINUTO || 0)
  return hour * 60 + minute
}

function msHastaSiguienteEjecucion() {
  const now = DateTime.now().setZone(TZ)
  const targetMinutes = minutosObjetivo()
  const todayTarget = now.startOf('day').plus({ minutes: targetMinutes })
  const next = now < todayTarget ? todayTarget : todayTarget.plus({ days: 1 })
  return Math.max(next.diff(now, 'milliseconds').milliseconds, 1000)
}

async function ejecutar() {
  try {
    const resultado = await notificarCobrosDelDia()
    console.log(
      `[CobrosNotificaciones] fecha=${resultado.fecha} encontrados=${resultado.encontrados} enviados=${resultado.enviados} omitidos=${resultado.omitidos} dryRun=${resultado.dryRun}`
    )
  } catch (error) {
    console.error('[CobrosNotificaciones] Error:', error)
  } finally {
    setTimeout(ejecutar, msHastaSiguienteEjecucion())
  }
}

const globalState = globalThis as typeof globalThis & { [GUARD_KEY]?: boolean }

if (boolEnv('COBROS_NOTIFICACIONES_AUTO') && !globalState[GUARD_KEY]) {
  globalState[GUARD_KEY] = true
  setTimeout(ejecutar, msHastaSiguienteEjecucion())
}
