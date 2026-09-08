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
    async resolverLote(data) {
        const numero = data.numeroLote?.trim();
        if (!numero)
            return null;
        const lote = await Lote.firstOrCreate({ numero }, {
            numero,
            medida: data.medidaLote?.trim() || null,
            area: data.areaLote?.trim() || null,
            estado: 'disponible',
        });
        lote.merge({
            medida: data.medidaLote?.trim() || lote.medida || null,
            area: data.areaLote?.trim() || lote.area || null,
            estado: 'vendido',
        });
        await lote.save();
        return lote;
    }
    normalizarPredios(data) {
        const predios = data.predios?.length
            ? data.predios
            : [
                {
                    numeroLote: data.numeroLote,
                    medidaLote: data.medidaLote,
                    areaLote: data.areaLote,
                },
            ];
        return predios
            .map((predio) => ({
            numeroLote: predio.numeroLote?.trim() || '',
            medidaLote: predio.medidaLote?.trim() || undefined,
            areaLote: predio.areaLote?.trim() || undefined,
            precio: predio.precio,
        }))
            .filter((predio) => predio.numeroLote);
    }
    async resolverLotesPredios(predios) {
        return Promise.all(predios.map(async (predio) => ({
            predio,
            lote: await this.resolverLote(predio),
        })));
    }
    async crearPrediosVenta(ventaId, lotesPredios) {
        for (const item of lotesPredios) {
            if (!item.lote)
                continue;
            await VentaPredio.create({
                ventaId,
                loteId: item.lote.id,
                precio: item.predio.precio ?? null,
            });
        }
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
            const predios = this.normalizarPredios(data);
            if (predios.length === 0) {
                return response.badRequest({ message: 'Debe agregar al menos un predio a la venta' });
            }
            const lotesPredios = await this.resolverLotesPredios(predios);
            const lote = lotesPredios[0]?.lote || null;
            const enganche = Number(data.enganche || 0);
            if (enganche < 0) {
                return response.badRequest({ message: 'El enganche no puede ser negativo' });
            }
            if (enganche - Number(data.monto) > 0.01) {
                return response.badRequest({ message: 'El enganche no puede exceder el precio del lote' });
            }
            const prestamo = await Prestamo.create({
                clienteId: data.clienteId,
                loteId: lote?.id || null,
                monto: data.monto,
                cuotas: data.cuotas,
                fechaInicio: this.fechaDesdeIso(data.fechaInicio),
                fechaFin: this.fechaDesdeIso(data.fechaFin),
                frecuenciaPago: data.frecuenciaPago || 'mensual',
                fechaCobro: this.fechaDesdeIso(data.fechaCobro),
                estado: 'activo',
            });
            await this.crearPrediosVenta(prestamo.id, lotesPredios);
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
                descripcion: `Creo venta de ${predios.length} predio(s) (${prestamo.numeroLote || 'N/A'}) por Q${prestamo.monto} para ${prestamo.cliente.nombres} ${prestamo.cliente.apellidos}${enganche > 0 ? ` con enganche de Q${enganche}` : ''}`,
                detalle: {
                    monto: prestamo.monto,
                    cuotas: prestamo.cuotas,
                    numeroLote: prestamo.numeroLote,
                    predios,
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
            if (data.clienteId !== undefined && Number(data.clienteId) !== Number(prestamo.clienteId)) {
                await registrarActividad({
                    usuarioId: user.id,
                    tipo: 'actualizar',
                    entidad: 'prestamo',
                    entidadId: prestamo.id,
                    descripcion: `Transfirio venta #${prestamo.id} del cliente anterior #${prestamo.clienteId} al nuevo cliente #${data.clienteId}`,
                    detalle: {
                        clienteAnteriorId: prestamo.clienteId,
                        clienteNuevoId: data.clienteId,
                        ventaId: prestamo.id,
                        transferidoPor: user.id,
                    },
                });
            }
            const predios = data.predios ? this.normalizarPredios(data) : [];
            const lotesPredios = data.predios ? await this.resolverLotesPredios(predios) : [];
            const lote = data.predios ? lotesPredios[0]?.lote || null : await this.resolverLote(data);
            prestamo.merge({
                clienteId: data.clienteId ?? prestamo.clienteId,
                monto: data.monto ?? prestamo.monto,
                cuotas: data.cuotas ?? prestamo.cuotas,
                fechaInicio: this.fechaDesdeIso(data.fechaInicio) ?? prestamo.fechaInicio,
                fechaFin: this.fechaDesdeIso(data.fechaFin) ?? prestamo.fechaFin,
                frecuenciaPago: data.frecuenciaPago ?? prestamo.frecuenciaPago,
                fechaCobro: data.fechaCobro === undefined ? prestamo.fechaCobro : this.fechaDesdeIso(data.fechaCobro),
                estado: data.estado ?? prestamo.estado,
                loteId: lote?.id ?? prestamo.loteId,
            });
            await prestamo.save();
            if (data.predios) {
                await VentaPredio.query().where('venta_id', prestamo.id).delete();
                await this.crearPrediosVenta(prestamo.id, lotesPredios);
            }
            await prestamo.load('cliente');
            await prestamo.load('lote');
            await prestamo.load('predios', (prediosQuery) => prediosQuery.preload('lote'));
            await registrarActividad({
                usuarioId: user.id,
                tipo: 'actualizar',
                entidad: 'prestamo',
                entidadId: prestamo.id,
                descripcion: `Actualizo venta del lote ${prestamo.numeroLote || 'N/A'} de ${prestamo.cliente.nombres} ${prestamo.cliente.apellidos} - estado: ${prestamo.estado}`,
            });
            return response.ok({ message: 'Venta actualizada exitosamente', prestamo });
        }
        catch (error) {
            if (isValidationError(error)) {
                return response.badRequest({
                    message: 'Datos invalidos para actualizar venta',
                    errors: validationMessages(error),
                });
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