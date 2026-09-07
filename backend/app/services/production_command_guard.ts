const COMANDOS_PROHIBIDOS_EN_PRODUCCION = new Set([
  'db:seed',
  'db:truncate',
  'db:wipe',
  'migration:fresh',
  'migration:reset',
  'migration:refresh',
  'app:seed-admin',
  'dev:seed-ficticio',
])

export function verificarComandoSeguroEnProduccion(args: string[], nodeEnv: string) {
  const comando = args.find((arg) => !arg.startsWith('-'))
  if (nodeEnv === 'production' && comando && COMANDOS_PROHIBIDOS_EN_PRODUCCION.has(comando)) {
    throw new Error(`[SEGURIDAD] ${comando} esta prohibido en production`)
  }
}

export function esComandoConBloqueoDeProduccion(args: string[]) {
  const comando = args.find((arg) => !arg.startsWith('-'))
  return Boolean(comando && COMANDOS_PROHIBIDOS_EN_PRODUCCION.has(comando))
}
