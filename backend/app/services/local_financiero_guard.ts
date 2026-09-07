import env from '#start/env'

type EntornoFinanciero = {
  NODE_ENV: string
  DB_HOST: string
  DB_PORT: number
  DB_DATABASE: string
}

export function verificarEntornoFinancieroLocal(testOnly = false) {
  const nodeEnv = env.get('NODE_ENV')
  const host = env.get('DB_HOST')
  const port = Number(env.get('DB_PORT'))
  const database = env.get('DB_DATABASE')
  if (
    !['development', 'test'].includes(nodeEnv) ||
    !['localhost', '127.0.0.1', '::1'].includes(host) ||
    port === 5432 ||
    !(
      testOnly ? ['villas_del_rosario_test'] : ['villas_del_rosario_dev', 'villas_del_rosario_test']
    ).includes(database) ||
    (testOnly && nodeEnv !== 'test')
  ) {
    throw new Error(
      'Operacion financiera local bloqueada: verificar NODE_ENV, DB_HOST, DB_PORT (no usar 5432) y DB_DATABASE'
    )
  }
  return { NODE_ENV: nodeEnv, DB_HOST: host, DB_PORT: port, DB_DATABASE: database }
}

export function verificarPermisoBackfill(confirmProduction = false) {
  return validarPermisoBackfill(
    {
      NODE_ENV: env.get('NODE_ENV'),
      DB_HOST: env.get('DB_HOST'),
      DB_PORT: Number(env.get('DB_PORT')),
      DB_DATABASE: env.get('DB_DATABASE'),
    },
    confirmProduction
  )
}

export function validarPermisoBackfill(entorno: EntornoFinanciero, confirmProduction = false) {
  if (entorno.NODE_ENV === 'production') {
    if (!confirmProduction) {
      throw new Error(
        'Backfill en produccion bloqueado: vuelve a ejecutar con --confirm-production'
      )
    }

    return entorno
  }

  const basePermitida = ['villas_del_rosario_dev', 'villas_del_rosario_test'].includes(
    entorno.DB_DATABASE
  )
  const hostLocal = ['localhost', '127.0.0.1', '::1'].includes(entorno.DB_HOST)
  if (
    !['development', 'test'].includes(entorno.NODE_ENV) ||
    !hostLocal ||
    entorno.DB_PORT === 5432 ||
    !basePermitida
  ) {
    throw new Error(
      'Backfill bloqueado: fuera de production solo se permite en las bases locales dev/test'
    )
  }

  return entorno
}
