import { BaseCommand } from '@adonisjs/core/ace';
import { DateTime } from 'luxon';
import env from '#start/env';
import db from '@adonisjs/lucid/services/db';
import User from '#models/user';
import Client from '#models/client';
import Lote from '#models/lote';
import Prestamo from '#models/prestamo';
import Pago from '#models/pago';
import ProgramacionPago from '#models/programacion_pago';
import { aplicarPagoVenta } from '#services/aplicar_pago_service';
export default class DevSeedCommand extends BaseCommand {
    static commandName = 'dev:seed-ficticio';
    static description = 'Siembra datos ficticios exhaustivos para el entorno local dev/test';
    static options = {
        startApp: true,
    };
    async run() {
        const nodeEnv = env.get('NODE_ENV');
        const dbName = env.get('DB_DATABASE') || '';
        if (nodeEnv === 'production' || (!dbName.endsWith('_dev') && !dbName.endsWith('_test'))) {
            this.logger.error('====================================================================');
            this.logger.error('[SEGURIDAD] ABORTANDO: Este seeder destructivo solo puede ejecutarse');
            this.logger.error('sobre bases cuyo nombre termine en _dev o _test.');
            this.logger.error(`Base actual: ${dbName} (NODE_ENV=${nodeEnv})`);
            this.logger.error('====================================================================');
            this.exitCode = 1;
            return;
        }
        this.logger.info(`Iniciando siembra de datos ficticios en base: ${dbName}...`);
        await db.rawQuery('TRUNCATE TABLE pago_aplicaciones, notificaciones_cobros, programaciones_pago, pagos, venta_predios, ventas, lotes, clientes, actividades, api_tokens, users RESTART IDENTITY CASCADE;');
        const admin = await User.create({
            name: 'Admin Ficticio',
            email: 'admin.dev@villasdelrosario.local',
            username: 'admin',
            password: 'password123',
            role: 'admin',
        });
        const trabajador = await User.create({
            name: 'Cobrador Ficticio',
            email: 'cobrador.dev@villasdelrosario.local',
            username: 'cobrador',
            password: 'password123',
            role: 'trabajador',
        });
        this.logger.success('Usuarios creados: admin y cobrador (password: password123)');
        const nombresClientes = [
            ['Carlos', 'Mendoza', '5551-0001', 'Zona 1, Ciudad'],
            ['Maria', 'Lopez', '5551-0002', 'Zona 5, Ciudad'],
            ['Juan', 'Perez', '5551-0003', 'Zona 10, Ciudad'],
            ['Ana', 'Gomez', '5551-0004', 'Zona 7, Ciudad'],
            ['Pedro', 'Ramirez', '5551-0005', 'Zona 3, Ciudad'],
            ['Lucia', 'Morales', '5551-0006', 'Zona 11, Ciudad'],
            ['Jorge', 'Castillo', '5551-0007', 'Zona 2, Ciudad'],
            ['Sofia', 'Herrera', '5551-0008', 'Zona 12, Ciudad'],
            ['Diego', 'Alvarez', '5551-0009', 'Zona 4, Ciudad'],
            ['Elena', 'Torres', '5551-0010', 'Zona 9, Ciudad'],
            ['Fernando', 'Vargas', '5551-0011', 'Zona 6, Ciudad'],
            ['Rosa', 'Chavez', '5551-0012', 'Zona 8, Ciudad'],
        ];
        const clientes = [];
        for (const [nom, ape, tel, dir] of nombresClientes) {
            const c = await Client.create({
                nombres: nom,
                apellidos: ape,
                telefono: tel,
                direccion: dir,
                activo: true,
            });
            clientes.push(c);
        }
        this.logger.success(`${clientes.length} clientes ficticios creados`);
        const lotes = [];
        for (let i = 1; i <= 20; i++) {
            const l = await Lote.create({
                numero: `M1-L${i}`,
                medida: '10x20 mts',
                area: '200 m2',
                estado: 'disponible',
            });
            lotes.push(l);
        }
        this.logger.success(`${lotes.length} lotes creados`);
        const TZ = 'America/Guatemala';
        const hoy = DateTime.now().setZone(TZ);
        const ventaA = await Prestamo.create({
            clienteId: clientes[0].id,
            loteId: lotes[0].id,
            monto: 100000,
            cuotas: 20,
            fechaInicio: hoy.minus({ months: 2 }),
            fechaFin: hoy.plus({ months: 18 }),
            fechaCobro: hoy.minus({ months: 2 }),
            estado: 'activo',
        });
        lotes[0].estado = 'vendido';
        await lotes[0].save();
        await aplicarPagoVenta({
            ventaId: ventaA.id,
            monto: 10000,
            fechaPago: hoy.minus({ months: 2 }),
            usuarioId: admin.id,
        });
        const ventaB = await Prestamo.create({
            clienteId: clientes[1].id,
            loteId: lotes[1].id,
            monto: 120000,
            cuotas: 20,
            fechaInicio: hoy.minus({ months: 3 }),
            fechaFin: hoy.plus({ months: 17 }),
            fechaCobro: hoy.minus({ months: 3 }),
            estado: 'activo',
        });
        lotes[1].estado = 'vendido';
        await lotes[1].save();
        await Pago.create({
            prestamoId: ventaB.id,
            numeroCuota: 0,
            montoPagado: 20000,
            fechaPago: hoy.minus({ months: 3 }),
            usuarioId: admin.id,
            tipoPago: 'enganche',
            anulado: false,
        });
        const ventaC = await Prestamo.create({
            clienteId: clientes[2].id,
            loteId: lotes[2].id,
            monto: 100000,
            cuotas: 3,
            fechaInicio: hoy.minus({ months: 1 }),
            fechaFin: hoy.plus({ months: 2 }),
            fechaCobro: hoy.minus({ months: 1 }),
            estado: 'activo',
        });
        lotes[2].estado = 'vendido';
        await lotes[2].save();
        await aplicarPagoVenta({
            ventaId: ventaC.id,
            monto: 33333.33,
            fechaPago: hoy.minus({ months: 1 }),
            usuarioId: trabajador.id,
        });
        const ventaD = await Prestamo.create({
            clienteId: clientes[3].id,
            loteId: lotes[3].id,
            monto: 20000,
            cuotas: 2,
            fechaInicio: hoy.minus({ months: 5 }),
            fechaFin: hoy.minus({ months: 3 }),
            fechaCobro: hoy.minus({ months: 5 }),
            estado: 'activo',
        });
        lotes[3].estado = 'vendido';
        await lotes[3].save();
        await aplicarPagoVenta({
            ventaId: ventaD.id,
            monto: 20000,
            fechaPago: hoy.minus({ months: 4 }),
            usuarioId: trabajador.id,
        });
        const ventaE = await Prestamo.create({
            clienteId: clientes[4].id,
            loteId: lotes[4].id,
            monto: 50000,
            cuotas: 10,
            fechaInicio: hoy.minus({ months: 2 }),
            fechaFin: hoy.plus({ months: 8 }),
            fechaCobro: hoy.minus({ months: 2 }),
            estado: 'vencido',
        });
        lotes[4].estado = 'vendido';
        await lotes[4].save();
        void ventaE;
        const ventaF = await Prestamo.create({
            clienteId: clientes[5].id,
            loteId: lotes[5].id,
            monto: 50000,
            cuotas: 10,
            fechaInicio: hoy.minus({ months: 1 }),
            fechaFin: hoy.plus({ months: 9 }),
            fechaCobro: hoy.minus({ months: 1 }),
            estado: 'activo',
        });
        lotes[5].estado = 'vendido';
        await lotes[5].save();
        await aplicarPagoVenta({
            ventaId: ventaF.id,
            monto: 2000,
            fechaPago: hoy.minus({ days: 10 }),
            usuarioId: trabajador.id,
            tipoPago: 'pago_parcial',
        });
        const ventaG = await Prestamo.create({
            clienteId: clientes[6].id,
            loteId: lotes[6].id,
            monto: 60000,
            cuotas: 12,
            fechaInicio: hoy.minus({ months: 1 }),
            fechaFin: hoy.plus({ months: 11 }),
            fechaCobro: hoy.minus({ days: 20 }),
            estado: 'activo',
        });
        lotes[6].estado = 'vendido';
        await lotes[6].save();
        await ProgramacionPago.create({
            prestamoId: ventaG.id,
            usuarioId: trabajador.id,
            numeroCuota: 1,
            tipoGestion: 'no_pago',
            montoRecibido: 0,
            nota: 'Cliente solicito prorroga por emergencia medica',
            fechaProgramada: hoy.plus({ days: 15 }),
            resuelto: false,
        });
        const ventaH = await Prestamo.create({
            clienteId: clientes[7].id,
            loteId: lotes[7].id,
            monto: 40000,
            cuotas: 8,
            fechaInicio: hoy.minus({ months: 6 }),
            fechaFin: hoy.plus({ months: 2 }),
            fechaCobro: hoy.minus({ months: 6 }),
            estado: 'cancelado',
            canceladoAt: hoy.minus({ days: 5 }),
            canceladoPor: admin.id,
            motivoCancelacion: 'Desistimiento mutuo de compra',
        });
        lotes[7].estado = 'disponible';
        await lotes[7].save();
        void ventaH;
        const clienteDesactivado = clientes[8];
        clienteDesactivado.activo = false;
        clienteDesactivado.desactivadoAt = hoy.minus({ days: 2 });
        clienteDesactivado.desactivadoPor = admin.id;
        await clienteDesactivado.save();
        const ventaI = await Prestamo.create({
            clienteId: clienteDesactivado.id,
            loteId: lotes[8].id,
            monto: 30000,
            cuotas: 6,
            fechaInicio: hoy.minus({ months: 3 }),
            fechaFin: hoy.plus({ months: 3 }),
            fechaCobro: hoy.minus({ months: 3 }),
            estado: 'activo',
        });
        lotes[8].estado = 'vendido';
        await lotes[8].save();
        await aplicarPagoVenta({
            ventaId: ventaI.id,
            monto: 5000,
            fechaPago: hoy.minus({ months: 2 }),
            usuarioId: trabajador.id,
        });
        this.logger.success('Casos A hasta I creados exitosamente con datos 100% ficticios.');
    }
}
//# sourceMappingURL=dev_seed.js.map