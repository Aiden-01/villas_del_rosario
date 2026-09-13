import { readFile } from 'node:fs/promises';
import db from '@adonisjs/lucid/services/db';
export const TOTAL_FEATURES_LOTES = 12;
export const TOLERANCIA_AREA_M2 = 0.05;
function esObjeto(valor) {
    return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
}
function textoObligatorio(valor, campo, indice) {
    if (typeof valor !== 'string' || !valor.trim()) {
        throw new Error(`Feature ${indice + 1}: ${campo} es obligatorio`);
    }
    const texto = valor.trim();
    if (texto.length > 255) {
        throw new Error(`Feature ${indice + 1}: ${campo} excede 255 caracteres`);
    }
    return texto;
}
function numeroLoteObligatorio(valor, indice) {
    if (typeof valor !== 'string' && typeof valor !== 'number') {
        throw new Error(`Feature ${indice + 1}: lote_no es obligatorio`);
    }
    const numero = String(valor).trim();
    if (!numero) {
        throw new Error(`Feature ${indice + 1}: lote_no es obligatorio`);
    }
    if (numero.length > 255) {
        throw new Error(`Feature ${indice + 1}: lote_no excede 255 caracteres`);
    }
    return numero;
}
function normalizarPoligono(coordenadas, indice) {
    if (!Array.isArray(coordenadas)) {
        throw new Error(`Feature ${indice + 1}: coordenadas MultiPolygon invalidas`);
    }
    if (coordenadas.length !== 1) {
        throw new Error(`Feature ${indice + 1}: MultiPolygon debe contener exactamente una parte; contiene ${coordenadas.length}`);
    }
    const poligono = coordenadas[0];
    if (!Array.isArray(poligono) || poligono.length === 0) {
        throw new Error(`Feature ${indice + 1}: Polygon sin anillos`);
    }
    return poligono.map((anillo, indiceAnillo) => {
        if (!Array.isArray(anillo) || anillo.length < 4) {
            throw new Error(`Feature ${indice + 1}: anillo ${indiceAnillo + 1} invalido`);
        }
        const anillo2D = anillo.map((posicion, indicePosicion) => {
            if (!Array.isArray(posicion) ||
                posicion.length < 2 ||
                typeof posicion[0] !== 'number' ||
                typeof posicion[1] !== 'number' ||
                !Number.isFinite(posicion[0]) ||
                !Number.isFinite(posicion[1])) {
                throw new Error(`Feature ${indice + 1}: posicion ${indicePosicion + 1} del anillo ${indiceAnillo + 1} invalida`);
            }
            const [longitud, latitud] = posicion;
            if (longitud < -180 || longitud > 180 || latitud < -90 || latitud > 90) {
                throw new Error(`Feature ${indice + 1}: coordenada fuera de EPSG:4326`);
            }
            return [longitud, latitud];
        });
        const primera = anillo2D[0];
        const ultima = anillo2D[anillo2D.length - 1];
        if (primera[0] !== ultima[0] || primera[1] !== ultima[1]) {
            throw new Error(`Feature ${indice + 1}: anillo ${indiceAnillo + 1} no esta cerrado`);
        }
        return anillo2D;
    });
}
export function validarYNormalizarGeoJsonLotes(documento) {
    if (!esObjeto(documento) || documento.type !== 'FeatureCollection') {
        throw new Error('El archivo debe ser un GeoJSON FeatureCollection');
    }
    if (!Array.isArray(documento.features) || documento.features.length !== TOTAL_FEATURES_LOTES) {
        const total = Array.isArray(documento.features) ? documento.features.length : 0;
        throw new Error(`Se requieren exactamente ${TOTAL_FEATURES_LOTES} features; se recibieron ${total}`);
    }
    const codigos = new Set();
    const numerosLote = new Set();
    return documento.features.map((feature, indice) => {
        if (!esObjeto(feature) || feature.type !== 'Feature' || !esObjeto(feature.properties)) {
            throw new Error(`Feature ${indice + 1}: estructura invalida`);
        }
        const codigo = textoObligatorio(feature.properties.codigo, 'codigo', indice);
        const claveCodigo = codigo.toLocaleUpperCase();
        if (codigos.has(claveCodigo)) {
            throw new Error(`Codigo duplicado en GeoJSON: ${codigo}`);
        }
        codigos.add(claveCodigo);
        const loteNumero = numeroLoteObligatorio(feature.properties.lote_no, indice);
        if (numerosLote.has(loteNumero)) {
            throw new Error(`lote_no duplicado en GeoJSON: ${loteNumero}`);
        }
        numerosLote.add(loteNumero);
        const areaFuente = feature.properties.area_m2;
        if (typeof areaFuente !== 'number' || !Number.isFinite(areaFuente) || areaFuente < 0) {
            throw new Error(`Feature ${indice + 1}: area_m2 debe ser un numero mayor o igual a cero`);
        }
        if (!esObjeto(feature.geometry) || feature.geometry.type !== 'MultiPolygon') {
            throw new Error(`Feature ${indice + 1}: la geometria debe ser MultiPolygon`);
        }
        return {
            codigo,
            loteNumero,
            areaFuente,
            geometria: {
                type: 'Polygon',
                coordinates: normalizarPoligono(feature.geometry.coordinates, indice),
            },
        };
    });
}
export function parsearAreaSistema(valor, loteNumero) {
    if (typeof valor === 'number' && Number.isFinite(valor) && valor >= 0)
        return valor;
    if (typeof valor !== 'string') {
        throw new Error(`Lote ${loteNumero}: area del sistema ausente o invalida`);
    }
    const coincidencia = valor.match(/^\s*(\d+(?:[.,]\d+)?)\s*(?:m(?:2|²))?\s*$/iu);
    if (!coincidencia) {
        throw new Error(`Lote ${loteNumero}: area del sistema no tiene un formato interpretable: ${valor}`);
    }
    const area = Number(coincidencia[1].replace(',', '.'));
    if (!Number.isFinite(area) || area < 0) {
        throw new Error(`Lote ${loteNumero}: area del sistema invalida`);
    }
    return area;
}
async function validarGeometriaPostgis(trx, fila) {
    const geometriaJson = JSON.stringify(fila.geometria);
    const validacion = await trx.rawQuery(`
      WITH convertida AS (
        SELECT ST_Force2D(
          ST_SetSRID(ST_GeomFromGeoJSON(?), 4326)
        ) AS geom
      )
      SELECT
        GeometryType(geom) AS tipo,
        ST_SRID(geom) AS srid,
        ST_NDims(geom) AS dimensiones,
        ST_IsValid(geom) AS valida,
        ST_IsEmpty(geom) AS vacia,
        ST_IsValidReason(geom) AS motivo
      FROM convertida
    `, [geometriaJson]);
    const resultado = validacion.rows[0];
    if (!resultado ||
        resultado.tipo !== 'POLYGON' ||
        Number(resultado.srid) !== 4326 ||
        Number(resultado.dimensiones) !== 2 ||
        !resultado.valida ||
        resultado.vacia) {
        throw new Error(`Lote ${fila.loteNumero}: geometria convertida invalida (${resultado?.motivo || 'sin detalle'})`);
    }
}
async function prepararFilas(trx, features, dryRun) {
    const numeros = features.map((feature) => feature.loteNumero);
    const consultaLotes = trx.from('lotes').select('id', 'numero', 'area').whereIn('numero', numeros);
    if (!dryRun)
        consultaLotes.forUpdate();
    const lotes = await consultaLotes;
    const lotesPorNumero = new Map(lotes.map((lote) => [String(lote.numero), lote]));
    const faltantes = numeros.filter((numero) => !lotesPorNumero.has(numero));
    if (faltantes.length > 0) {
        throw new Error(`Lotes inexistentes en el sistema: ${faltantes.join(', ')}`);
    }
    const filas = features.map((feature) => {
        const lote = lotesPorNumero.get(feature.loteNumero);
        const areaSistema = parsearAreaSistema(lote.area, feature.loteNumero);
        const diferenciaArea = Math.abs(areaSistema - feature.areaFuente);
        if (diferenciaArea > TOLERANCIA_AREA_M2 + 1e-9) {
            throw new Error(`Lote ${feature.loteNumero}: area incompatible; sistema=${areaSistema.toFixed(2)} m2, fuente=${feature.areaFuente.toFixed(2)} m2, diferencia=${diferenciaArea.toFixed(2)} m2`);
        }
        return {
            ...feature,
            loteId: Number(lote.id),
            areaSistema,
            diferenciaArea,
        };
    });
    const loteIds = filas.map((fila) => fila.loteId);
    const codigos = filas.map((fila) => fila.codigo);
    const existentes = await trx
        .from('lote_geometrias')
        .select('lote_id', 'codigo')
        .whereIn('lote_id', loteIds)
        .orWhereIn('codigo', codigos);
    if (existentes.length > 0) {
        const detalle = existentes
            .map((fila) => `lote_id=${fila.lote_id}, codigo=${fila.codigo}`)
            .join('; ');
        throw new Error(`Ya existen geometrías asociadas; no se sobrescribirá ninguna: ${detalle}`);
    }
    for (const fila of filas) {
        await validarGeometriaPostgis(trx, fila);
    }
    return filas;
}
export async function importarGeometriasLotes(documento, opciones = {}) {
    const dryRun = opciones.dryRun ?? false;
    const features = validarYNormalizarGeoJsonLotes(documento);
    return db.transaction(async (trx) => {
        const filas = await prepararFilas(trx, features, dryRun);
        if (!dryRun) {
            for (const fila of filas) {
                await trx.rawQuery(`
            INSERT INTO lote_geometrias (
              lote_id, codigo, area_fuente, geom, created_at, updated_at
            ) VALUES (
              ?, ?, ?,
              ST_Force2D(ST_SetSRID(ST_GeomFromGeoJSON(?), 4326))::geometry(Polygon,4326),
              NOW(), NOW()
            )
          `, [fila.loteId, fila.codigo, fila.areaFuente, JSON.stringify(fila.geometria)]);
            }
        }
        return {
            dryRun,
            total: filas.length,
            filas: filas.map((fila) => ({
                lote: fila.loteNumero,
                codigo: fila.codigo,
                areaSistema: fila.areaSistema,
                areaFuente: fila.areaFuente,
                diferenciaArea: Number(fila.diferenciaArea.toFixed(2)),
                resultado: dryRun ? 'LISTO' : 'IMPORTADO',
            })),
        };
    });
}
export async function importarGeometriasLotesDesdeArchivo(rutaArchivo, opciones = {}) {
    const contenido = await readFile(rutaArchivo, 'utf8');
    let documento;
    try {
        documento = JSON.parse(contenido);
    }
    catch {
        throw new Error(`GeoJSON invalido: ${rutaArchivo}`);
    }
    return importarGeometriasLotes(documento, opciones);
}
//# sourceMappingURL=importar_lotes_geometrias_service.js.map