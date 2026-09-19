import db from '@adonisjs/lucid/services/db';
import Prestamo from '#models/prestamo';
import Pago from '#models/pago';
import Lote from '#models/lote';
import VentaPredio from '#models/venta_predio';
import ApiToken from '#models/api_token';
import { registrarActividad } from '../helpers/registrar_actividad.js';
import { DateTime } from 'luxon';
import { aplicarAbonoAVenta } from '../services/abonos_ventas_service.js';
import { createVentaValidator, updateVentaValidator } from '#validators/ventas_validator';
import { cleanEmptyStrings, isValidationError, validationMessages } from '#validators/helpers';
import { resumenFinancieroVenta } from '#services/mora_service';
class LoteVentaError extends Error {
    status;
    loteId;
    constructor(message, status, loteId) {
        super(message);
        this.status = status;
        this.loteId = loteId;
    }
}
export default class PrestamosController {
    async verifyToken(token) {
        if (!token)
            return null;
        const apiToken = await ApiToken.query()
            .where('token', token.replace('Bearer ', ''))
            .preload('user')
            .first();
        return apiToken?.user || null;
    }
    fechaDesdeIso(fecha) {
        return fecha ? DateTime.fromISO(fecha, { zone: 'America/Guatemala' }) : null;
    }
    normalizarPredios(data) {
        const predios = data.predios?.length
            ? data.predios
            : [
                {
                    loteId: data.loteId,
                    numeroLote: data.numeroLote,
                    medidaLote: data.medidaLote,
                    areaLote: data.areaLote,
                },
            ];
        return predios
            .map((predio) => ({
            loteId: predio.loteId,
            numeroLote: predio.numeroLote?.trim() || '',
            medidaLote: predio.medidaLote?.trim() || undefined,
            areaLote: predio.areaLote?.trim() || undefined,
            precio: predio.precio,
        }))
            .filter((predio) => predio.numeroLote);
    }
    async resolverLotesPrediosConLoteId(predios, trx, opciones = {}) {
        const predioSinLoteId = predios.find((predio) => !predio.loteId);
        if (predioSinLoteId) {
            throw new LoteVentaError('El lote debe estar registrado y autorizado antes de venderse', 409);
        }
        const ids = [...new Set(predios.map((predio) => predio.loteId))];
        const lotesBloqueados = await Lote.query({ client: trx })
            .whereIn('id', ids)
            .orderBy('id', 'asc')
            .forUpdate();
        const lotesPorId = new Map(lotesBloqueados.map((lote) => [lote.id, lote]));
        const resultado = [];
        for (const predio of predios) {
            const lote = lotesPorId.get(predio.loteId);
            if (!lote) {
                throw new LoteVentaError('El lote seleccionado ya no existe', 404, predio.loteId);
            }
            if (predio.numeroLote && lote.numero !== predio.numeroLote) {
                throw new LoteVentaError('El lote seleccionado no coincide con el numero recibido', 400, predio.loteId);
            }
            const perteneceVentaActual = opciones.loteIdsActuales?.has(lote.id) ?? false;
            if (!perteneceVentaActual && !lote.habilitadoVenta) {
                throw new LoteVentaError('El lote no esta autorizado para venta', 409, lote.id);
            }
            const consultaVentaActiva = Prestamo.query({ client: trx })
                .where('estado', '!=', 'cancelado')
                .where((query) => {
                query
                    .whereHas('predios', (ventaPredios) => ventaPredios.where('lote_id', lote.id))
                    .orWhere((legacy) => {
                    legacy.where('lote_id', lote.id).whereDoesntHave('predios', () => { });
                });
            });
            if (opciones.ventaIdActual) {
                consultaVentaActiva.whereNot('id', opciones.ventaIdActual);
            }
            const ventaActiva = await consultaVentaActiva.first();
            if (ventaActiva) {
                throw new LoteVentaError('El lote seleccionado ya no esta disponible', 409, lote.id);
            }
            lote.merge({ estado: 'vendido' });
            await lote.useTransaction(trx).save();
            resultado.push({ predio, lote });
        }
        const idsResueltos = resultado.map(({ lote }) => lote.id);
        const loteDuplicado = idsResueltos.find((id, index) => idsResueltos.indexOf(id) !== index);
        if (loteDuplicado) {
            throw new LoteVentaError('No se puede agregar el mismo lote mas de una vez', 400, loteDuplicado);
        }
        return resultado;
    }
    async index({ request, response }) {
        try {
            const authHeader = request.header('authorization');
            const user = await this.verifyToken(authHeader || '');
            if (!user)
                return response.forbidden({ message: 'No autorizado' });
            const { clienteId, mostrarAntiguos } = request.qs();
            const query = Prestamo.query()
                .preload('cliente')
                .preload('pagos', (q) => q.where('anulado', false))
                .preload('pagoAplicaciones', (q) => q.orderBy('numero_cuota', 'asc'))
                .preload('programaciones')
                .preload('lote')
                .preload('predios', (predios) => predios.preload('lote'));
            if (clienteId) {
                query.where('cliente_id', clienteId);
            }
            if (!mostrarAntiguos) {
                const hace6Meses = DateTime.now()
                    .setZone('America/Guatemala')
                    .minus({ months: 6 })
                    .toISODate();
                query.where((q) => {
                    q.where('estado', '!=', 'cancelado').orWhere((q2) => {
                        q2.where('estado', 'cancelado').where('fecha_fin', '>=', hace6Meses);
                    });
                });
            }
            const prestamos = await query;
            return response.ok(prestamos.map((prestamo) => ({
                ...prestamo.serialize(),
                resumenFinanciero: resumenFinancieroVenta(prestamo, prestamo.programaciones || []),
            })));
        }
        catch (error) {
            console.error(error);
            return response.internalServerError({ message: 'Error al obtener ventas' });
        }
    }
    async show({ request, params, response }) {
        try {
            const authHeader = request.header('authorization');
            const user = await this.verifyToken(authHeader || '');
            if (!user)
                return response.forbidden({ message: 'No autorizado' });
            const prestamo = await Prestamo.query()
                .where('id', params.id)
                .preload('cliente')
                .preload('pagos', (q) => q.where('anulado', false))
                .preload('pagoAplicaciones', (q) => q.orderBy('numero_cuota', 'asc'))
                .preload('lote')
                .preload('predios', (predios) => predios.preload('lote'))
                .first();
            if (!prestamo)
                return response.notFound({ message: 'Venta no encontrada' });
            await prestamo.load('programaciones');
            const resumenFinanciero = resumenFinancieroVenta(prestamo, prestamo.programaciones || []);
            return response.ok({ ...prestamo.serialize(), resumenFinanciero });
        }
        catch (error) {
            console.error(error);
            return response.internalServerError({ message: 'Error al obtener venta' });
        }
    }
    async byCliente({ request, params, response }) {
        try {
            const authHeader = request.header('authorization');
            const user = await this.verifyToken(authHeader || '');
            if (!user)
                return response.forbidden({ message: 'No autorizado' });
            const prestamos = await Prestamo.query()
                .where('cliente_id', params.clienteId)
                .preload('cliente')
                .preload('pagos', (q) => q.where('anulado', false))
                .preload('pagoAplicaciones', (q) => q.orderBy('numero_cuota', 'asc'))
                .preload('programaciones')
                .preload('lote')
                .preload('predios', (predios) => predios.preload('lote'));
            return response.ok(prestamos.map((prestamo) => ({
                ...prestamo.serialize(),
                resumenFinanciero: resumenFinancieroVenta(prestamo, prestamo.programaciones || []),
            })));
        }
        catch (error) {
            console.error(error);
            return response.internalServerError({ message: 'Error al obtener ventas del cliente' });
        }
    }
    async store({ request, response }) {
        try {
            const authHeader = request.header('authorization');
            const user = await this.verifyToken(authHeader || '');
            if (!user)
                return response.forbidden({ message: 'No autorizado' });
            const data = await createVentaValidator.validate(cleanEmptyStrings(request.all(), ['medidaLote', 'areaLote', 'fechaCobro', 'enganche']));
            const prediosConLoteId = this.normalizarPredios(data);
            if (prediosConLoteId.length === 0) {
                return response.badRequest({ message: 'Debe agregar al menos un predio a la venta' });
            }
            const enganche = Number(data.enganche || 0);
            if (enganche < 0) {
                return response.badRequest({ message: 'El enganche no puede ser negativo' });
            }
            if (enganche - Number(data.monto) > 0.01) {
                return response.badRequest({ message: 'El enganche no puede exceder el precio del lote' });
            }
            if (data.loteId && prediosConLoteId[0]?.loteId !== data.loteId) {
                return response.badRequest({ message: 'El lote principal no coincide con los predios' });
            }
            const prestamo = await db.transaction(async (trx) => {
                const lotesPredios = await this.resolverLotesPrediosConLoteId(prediosConLoteId, trx);
                const lote = lotesPredios[0]?.lote || null;
                const venta = await Prestamo.create({
                    clienteId: data.clienteId,
                    loteId: lote?.id || null,
                    monto: data.monto,
                    cuotas: data.cuotas,
                    fechaInicio: this.fechaDesdeIso(data.fechaInicio),
                    fechaFin: this.fechaDesdeIso(data.fechaFin),
                    frecuenciaPago: data.frecuenciaPago || 'mensual',
                    fechaCobro: this.fechaDesdeIso(data.fechaCobro),
                    estado: 'activo',
                }, { client: trx });
                for (const item of lotesPredios) {
                    await VentaPredio.create({
                        ventaId: venta.id,
                        loteId: item.lote.id,
                        precio: item.predio.precio ?? null,
                    }, { client: trx });
                }
                return venta;
            });
            await prestamo.load('cliente');
            await prestamo.load('lote');
            await prestamo.load('predios', (prediosQuery) => prediosQuery.preload('lote'));
            let resultadoEnganche = null;
            if (enganche > 0) {
                resultadoEnganche = await aplicarAbonoAVenta({
                    ventaId: prestamo.id,
                    monto: enganche,
                    fechaPago: data.fechaInicio,
                    usuarioId: user.id,
                    tipoPago: 'enganche',
                });
                await prestamo.load('pagos');
            }
            await registrarActividad({
                usuarioId: user.id,
                tipo: 'crear',
                entidad: 'prestamo',
                entidadId: prestamo.id,
                descripcion: `Creo venta de ${prediosConLoteId.length} predio(s) (${prestamo.numeroLote || 'N/A'}) por Q${prestamo.monto} para ${prestamo.cliente.nombres} ${prestamo.cliente.apellidos}${enganche > 0 ? ` con enganche de Q${enganche}` : ''}`,
                detalle: {
                    monto: prestamo.monto,
                    cuotas: prestamo.cuotas,
                    numeroLote: prestamo.numeroLote,
                    predios: prediosConLoteId,
                    enganche,
                },
            });
            return response.created({
                message: enganche > 0
                    ? 'Venta creada exitosamente con enganche registrado'
                    : 'Venta creada exitosamente',
                prestamo,
                enganche: resultadoEnganche,
            });
        }
        catch (error) {
            if (isValidationError(error)) {
                return response.badRequest({
                    message: 'Datos invalidos para crear venta',
                    errors: validationMessages(error),
                });
            }
            if (error instanceof LoteVentaError) {
                const payload = { message: error.message, loteId: error.loteId };
                if (error.status === 404)
                    return response.notFound(payload);
                if (error.status === 409)
                    return response.conflict(payload);
                return response.badRequest(payload);
            }
            console.error(error);
            return response.internalServerError({ message: 'Error al crear venta' });
        }
    }
    async update({ request, params, response }) {
        try {
            const authHeader = request.header('authorization');
            const user = await this.verifyToken(authHeader || '');
            if (!user)
                return response.forbidden({ message: 'No autorizado' });
            const prestamo = await Prestamo.findOrFail(params.id);
            const camposPermitidos = [
                'clienteId',
                'monto',
                'cuotas',
                'fechaInicio',
                'fechaFin',
                'frecuenciaPago',
                'numeroLote',
                'medidaLote',
                'areaLote',
                'predios',
                'fechaCobro',
            ];
            if (user.role === 'admin')
                camposPermitidos.push('estado');
            const data = await updateVentaValidator.validate(cleanEmptyStrings(request.only(camposPermitidos), ['medidaLote', 'areaLote', 'fechaCobro']));
            const tienePagos = await Pago.query().where('venta_id', params.id).first();
            const intentaCambiarFinanciero = (data.monto !== undefined && Number(data.monto) !== Number(prestamo.monto)) ||
                (data.cuotas !== undefined && Number(data.cuotas) !== Number(prestamo.cuotas));
            if (tienePagos && intentaCambiarFinanciero) {
                return response.forbidden({
                    message: 'No se pueden modificar las condiciones financieras (monto o cuotas) de una venta con movimientos financieros registrados. Requiere un proceso de reestructuracion financiera.',
                });
            }
            const cambiaCliente = data.clienteId !== undefined && Number(data.clienteId) !== Number(prestamo.clienteId);
            const clienteAnteriorId = prestamo.clienteId;
            const intentaCambiarLoteSinPredios = data.predios === undefined &&
                (data.numeroLote !== undefined ||
                    data.medidaLote !== undefined ||
                    data.areaLote !== undefined);
            if (intentaCambiarLoteSinPredios) {
                return response.badRequest({
                    message: 'Para cambiar predios debe seleccionar lotes registrados y enviar su loteId',
                });
            }
            const predios = data.predios ? this.normalizarPredios(data) : [];
            if (data.predios && predios.length === 0) {
                return response.badRequest({ message: 'Debe agregar al menos un predio a la venta' });
            }
            const prestamoActualizado = await db.transaction(async (trx) => {
                const venta = await Prestamo.query({ client: trx })
                    .where('id', prestamo.id)
                    .forUpdate()
                    .firstOrFail();
                venta.useTransaction(trx);
                const reactivandoVenta = venta.estado === 'cancelado' && data.estado !== undefined && data.estado !== 'cancelado';
                let loteId = venta.loteId;
                let loteIdsActuales = new Set();
                if (data.predios || reactivandoVenta) {
                    await venta.load('predios');
                    loteIdsActuales = new Set(venta.predios.length > 0
                        ? venta.predios.flatMap((predio) => (predio.loteId ? [predio.loteId] : []))
                        : venta.loteId
                            ? [venta.loteId]
                            : []);
                }
                if (data.predios) {
                    const lotesPredios = await this.resolverLotesPrediosConLoteId(predios, trx, {
                        ventaIdActual: venta.id,
                        loteIdsActuales: reactivandoVenta ? undefined : loteIdsActuales,
                    });
                    loteId = lotesPredios[0]?.lote.id ?? null;
                    await VentaPredio.query({ client: trx }).where('venta_id', venta.id).delete();
                    for (const item of lotesPredios) {
                        await VentaPredio.create({
                            ventaId: venta.id,
                            loteId: item.lote.id,
                            precio: item.predio.precio ?? null,
                        }, { client: trx });
                    }
                }
                else if (reactivandoVenta) {
                    if (loteIdsActuales.size === 0 ||
                        (venta.predios.length > 0 && venta.predios.some((predio) => !predio.loteId))) {
                        throw new LoteVentaError('La venta no tiene todos sus lotes registrados y autorizados para reactivarse', 409);
                    }
                    await this.resolverLotesPrediosConLoteId([...loteIdsActuales].map((id) => ({ loteId: id })), trx, { ventaIdActual: venta.id });
                }
                venta.merge({
                    clienteId: data.clienteId ?? venta.clienteId,
                    monto: data.monto ?? venta.monto,
                    cuotas: data.cuotas ?? venta.cuotas,
                    fechaInicio: this.fechaDesdeIso(data.fechaInicio) ?? venta.fechaInicio,
                    fechaFin: this.fechaDesdeIso(data.fechaFin) ?? venta.fechaFin,
                    frecuenciaPago: data.frecuenciaPago ?? venta.frecuenciaPago,
                    fechaCobro: data.fechaCobro === undefined ? venta.fechaCobro : this.fechaDesdeIso(data.fechaCobro),
                    estado: data.estado ?? venta.estado,
                    loteId,
                });
                await venta.save();
                return venta;
            });
            if (cambiaCliente) {
                await registrarActividad({
                    usuarioId: user.id,
                    tipo: 'actualizar',
                    entidad: 'prestamo',
                    entidadId: prestamoActualizado.id,
                    descripcion: `Transfirio venta #${prestamoActualizado.id} del cliente anterior #${clienteAnteriorId} al nuevo cliente #${data.clienteId}`,
                    detalle: {
                        clienteAnteriorId,
                        clienteNuevoId: data.clienteId,
                        ventaId: prestamoActualizado.id,
                        transferidoPor: user.id,
                    },
                });
            }
            await prestamoActualizado.load('cliente');
            await prestamoActualizado.load('lote');
            await prestamoActualizado.load('predios', (prediosQuery) => prediosQuery.preload('lote'));
            await registrarActividad({
                usuarioId: user.id,
                tipo: 'actualizar',
                entidad: 'prestamo',
                entidadId: prestamoActualizado.id,
                descripcion: `Actualizo venta del lote ${prestamoActualizado.numeroLote || 'N/A'} de ${prestamoActualizado.cliente.nombres} ${prestamoActualizado.cliente.apellidos} - estado: ${prestamoActualizado.estado}`,
            });
            return response.ok({
                message: 'Venta actualizada exitosamente',
                prestamo: prestamoActualizado,
            });
        }
        catch (error) {
            if (isValidationError(error)) {
                return response.badRequest({
                    message: 'Datos invalidos para actualizar venta',
                    errors: validationMessages(error),
                });
            }
            if (error instanceof LoteVentaError) {
                const payload = { message: error.message, loteId: error.loteId };
                if (error.status === 404)
                    return response.notFound(payload);
                if (error.status === 409)
                    return response.conflict(payload);
                return response.badRequest(payload);
            }
            console.error(error);
            return response.internalServerError({ message: 'Error al actualizar venta' });
        }
    }
    async destroy({ request, params, response }) {
        try {
            const authHeader = request.header('authorization');
            const user = await this.verifyToken(authHeader || '');
            if (!user)
                return response.forbidden({ message: 'No autorizado' });
            if (user.role !== 'admin') {
                return response.forbidden({ message: 'Solo el administrador puede cancelar ventas' });
            }
            const motivo = String(request.input('motivo') || '').trim();
            if (motivo.length < 5) {
                return response.badRequest({
                    message: 'El motivo de cancelacion debe tener al menos 5 caracteres',
                });
            }
            const prestamo = await Prestamo.findOrFail(params.id);
            if (prestamo.estado === 'cancelado') {
                return response.conflict({ message: 'La venta ya esta cancelada' });
            }
            await prestamo.load('cliente');
            await prestamo.load('lote');
            await prestamo.load('predios', (prediosQuery) => prediosQuery.preload('lote'));
            const lotesIds = new Set();
            if (prestamo.loteId)
                lotesIds.add(prestamo.loteId);
            for (const predio of prestamo.predios || []) {
                if (predio.loteId)
                    lotesIds.add(predio.loteId);
            }
            for (const loteId of lotesIds) {
                const otraVentaActiva = await Prestamo.query()
                    .where('id', '!=', prestamo.id)
                    .whereIn('estado', ['activo', 'vencido', 'pagado'])
                    .whereHas('predios', (q) => q.where('lote_id', loteId))
                    .first();
                if (!otraVentaActiva) {
                    const lote = await Lote.find(loteId);
                    if (lote) {
                        lote.estado = 'disponible';
                        await lote.save();
                    }
                }
            }
            const desc = prestamo.cliente
                ? `${prestamo.cliente.nombres} ${prestamo.cliente.apellidos}`
                : 'Cliente N/A';
            const estadoAnterior = prestamo.estado;
            prestamo.estado = 'cancelado';
            prestamo.canceladoAt = DateTime.now();
            prestamo.canceladoPor = user.id;
            prestamo.motivoCancelacion = motivo;
            await prestamo.save();
            await registrarActividad({
                usuarioId: user.id,
                tipo: 'eliminar',
                entidad: 'prestamo',
                entidadId: Number(params.id),
                descripcion: `Cancelo venta de ${desc} - Motivo: ${motivo}`,
                detalle: {
                    estadoAnterior,
                    motivo,
                    canceladoPor: user.id,
                },
            });
            return response.ok({
                message: 'Venta cancelada exitosamente. Los pagos historicos se conservan.',
            });
        }
        catch (error) {
            console.error(error);
            return response.internalServerError({ message: 'Error al cancelar venta' });
        }
    }
}
//# sourceMappingURL=prestamos_controller.js.map