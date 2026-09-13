import { readFile } from 'node:fs/promises'
import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import app from '@adonisjs/core/services/app'
import db from '@adonisjs/lucid/services/db'
import Lote from '#models/lote'
import { importarGeometriasLotes } from '#services/importar_lotes_geometrias_service'

type DocumentoGeoJsonPrueba = {
  type: string
  features: Array<{
    type: string
    properties: {
      codigo: string
      lote_no: string
      area_m2: number
    }
    geometry: {
      type: string
      coordinates: number[][][][]
    }
  }>
}

async function cargarDocumento() {
  const ruta = app.makePath('database/geo/lotes_villas_rosario.geojson')
  return JSON.parse(await readFile(ruta, 'utf8')) as DocumentoGeoJsonPrueba
}

async function crearLotes(documento: DocumentoGeoJsonPrueba) {
  return Lote.createMany(
    documento.features.map((feature) => ({
      numero: feature.properties.lote_no,
      medida: null,
      area: `${feature.properties.area_m2.toFixed(2)} m2`,
      estado: 'disponible',
    }))
  )
}

async function contarGeometrias(loteIds: number[]) {
  const fila = await db
    .from('lote_geometrias')
    .whereIn('lote_id', loteIds)
    .count('* as total')
    .first()
  return Number(fila?.total || 0)
}

async function capturarError(accion: () => Promise<unknown>) {
  try {
    await accion()
    return ''
  } catch (error) {
    return error instanceof Error ? error.message : String(error)
  }
}

test.group('Importación segura de geometrías de lotes', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('dry-run e importación convierten los 12 MultiPolygon XYZ a Polygon 2D EPSG:4326', async ({
    assert,
  }) => {
    const documento = await cargarDocumento()
    const lotes = await crearLotes(documento)
    const loteIds = lotes.map((lote) => lote.id)
    const lotesAntes = lotes.map((lote) => ({
      id: lote.id,
      numero: lote.numero,
      area: lote.area,
      estado: lote.estado,
    }))

    const verificacion = await importarGeometriasLotes(documento, { dryRun: true })
    assert.equal(verificacion.total, 12)
    assert.isTrue(verificacion.filas.every((fila) => fila.resultado === 'LISTO'))
    assert.equal(await contarGeometrias(loteIds), 0)

    const importacion = await importarGeometriasLotes(documento)
    assert.equal(importacion.total, 12)
    assert.isTrue(importacion.filas.every((fila) => fila.resultado === 'IMPORTADO'))

    const geometrias = await db
      .from('lote_geometrias')
      .select(
        'lote_id',
        'codigo',
        'area_fuente',
        db.raw('GeometryType(geom) AS tipo'),
        db.raw('ST_SRID(geom) AS srid'),
        db.raw('ST_NDims(geom) AS dimensiones'),
        db.raw('ST_IsValid(geom) AS valida')
      )
      .whereIn('lote_id', loteIds)
      .orderBy('codigo', 'asc')

    assert.lengthOf(geometrias, 12)
    for (const geometria of geometrias) {
      assert.equal(geometria.tipo, 'POLYGON')
      assert.equal(Number(geometria.srid), 4326)
      assert.equal(Number(geometria.dimensiones), 2)
      assert.isTrue(geometria.valida)
    }
    const loteDiez = geometrias.find((geometria) => geometria.codigo === 'VR-Z3-L010')
    assert.equal(Number(loteDiez?.area_fuente), 285.43)

    const lotesDespues = await Lote.query().whereIn('id', loteIds).orderBy('id', 'asc')
    assert.deepEqual(
      lotesDespues.map((lote) => ({
        id: lote.id,
        numero: lote.numero,
        area: lote.area,
        estado: lote.estado,
      })),
      lotesAntes.sort((a, b) => a.id - b.id)
    )

    const errorReejecucion = await capturarError(() => importarGeometriasLotes(documento))
    assert.match(errorReejecucion, /Ya existen geometrías asociadas/)
    assert.equal(await contarGeometrias(loteIds), 12)
  })

  test('aborta cuando un lote_no no existe y no inserta geometrías', async ({ assert }) => {
    const documento = await cargarDocumento()
    const lotes = await crearLotes(documento)
    documento.features[0].properties.lote_no = '999'

    const mensaje = await capturarError(() => importarGeometriasLotes(documento))

    assert.match(mensaje, /Lotes inexistentes en el sistema: 999/)
    assert.equal(await contarGeometrias(lotes.map((lote) => lote.id)), 0)
  })

  test('aborta cuando el GeoJSON repite un código', async ({ assert }) => {
    const documento = await cargarDocumento()
    const lotes = await crearLotes(documento)
    documento.features[1].properties.codigo = documento.features[0].properties.codigo

    const mensaje = await capturarError(() => importarGeometriasLotes(documento))

    assert.match(mensaje, /Codigo duplicado en GeoJSON/)
    assert.equal(await contarGeometrias(lotes.map((lote) => lote.id)), 0)
  })

  test('acepta hasta 0.05 m2 y aborta si el área supera esa tolerancia', async ({ assert }) => {
    const documento = await cargarDocumento()
    const lotes = await crearLotes(documento)
    documento.features[0].properties.area_m2 += 0.05

    const verificacionLimite = await importarGeometriasLotes(documento, { dryRun: true })
    assert.equal(verificacionLimite.total, 12)

    documento.features[0].properties.area_m2 += 0.01

    const mensaje = await capturarError(() => importarGeometriasLotes(documento))

    assert.match(mensaje, /area incompatible/)
    assert.equal(await contarGeometrias(lotes.map((lote) => lote.id)), 0)
  })

  test('aborta cuando un MultiPolygon contiene más de una parte', async ({ assert }) => {
    const documento = await cargarDocumento()
    const lotes = await crearLotes(documento)
    documento.features[0].geometry.coordinates.push(
      structuredClone(documento.features[0].geometry.coordinates[0])
    )

    const mensaje = await capturarError(() => importarGeometriasLotes(documento))

    assert.match(mensaje, /debe contener exactamente una parte/)
    assert.equal(await contarGeometrias(lotes.map((lote) => lote.id)), 0)
  })

  test('revierte todas las inserciones si ocurre un error durante la escritura', async ({
    assert,
  }) => {
    const documento = await cargarDocumento()
    const lotes = await crearLotes(documento)
    const loteIds = lotes.map((lote) => lote.id)
    await db.rawQuery(`
      ALTER TABLE lote_geometrias
      ADD CONSTRAINT lote_geometrias_test_rollback
      CHECK (codigo <> 'VR-Z3-L001')
    `)

    const mensaje = await capturarError(() => importarGeometriasLotes(documento))

    assert.match(mensaje, /lote_geometrias_test_rollback/)
    assert.equal(await contarGeometrias(loteIds), 0)
  })

  test('rechaza cualquier colección que no tenga exactamente 12 features', async ({ assert }) => {
    const documento = await cargarDocumento()
    documento.features.pop()

    const mensaje = await capturarError(() => importarGeometriasLotes(documento))

    assert.match(mensaje, /exactamente 12 features; se recibieron 11/)
  })
})
