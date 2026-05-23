import { BaseCommand } from '@adonisjs/core/ace';
import { marcarVencidos } from '../app/jobs/marcar_vencidos_job.js';
export default class MarcarVencidosCommand extends BaseCommand {
    static commandName = 'prestamos:marcar-vencidos';
    static description = 'Marca como vencidas las ventas activas cuya fecha fin ya pasó';
    static options = {
        startApp: true,
    };
    async run() {
        this.logger.info('Iniciando proceso de ventas vencidas...');
        const count = await marcarVencidos();
        this.logger.success(`${count} ventas marcadas como vencidas`);
    }
}
//# sourceMappingURL=marcar_vencidos.js.map