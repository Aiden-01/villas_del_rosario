var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { verificarPermisoBackfill } from '#services/local_financiero_guard';
import { BaseCommand, flags } from '@adonisjs/core/ace';
import { reconstruirAplicacionesTodasLasVentas } from '#services/reconstruir_aplicaciones_service';
export default class FinancieroBackfill extends BaseCommand {
    static commandName = 'financiero:backfill';
    static description = 'Reconstruye deterministicamente las aplicaciones de pago para todas las ventas';
    static options = {
        startApp: true,
    };
    async run() {
        this.logger.info(JSON.stringify(verificarPermisoBackfill(this.confirmProduction)));
        this.logger.info('Iniciando reconstruccion de aplicaciones de pago...');
        this.logger.info('NOTA: Este comando NO modifica los pagos originales.');
        this.logger.info('Solo reconstruye la tabla derivada pago_aplicaciones.');
        this.logger.info('');
        const resultado = await reconstruirAplicacionesTodasLasVentas();
        this.logger.info(`Ventas procesadas: ${resultado.total}`);
        this.logger.success(`Ventas exitosas: ${resultado.exitosas}`);
        if (resultado.fallidas > 0 || resultado.anomalias.length > 0)
            this.exitCode = 1;
        if (resultado.fallidas > 0) {
            this.logger.error(`Ventas con error: ${resultado.fallidas}`);
        }
        if (resultado.anomalias.length > 0) {
            this.logger.warning(`Anomalias detectadas: ${resultado.anomalias.length}`);
            for (const anomalia of resultado.anomalias) {
                this.logger.warning(`  - ${anomalia}`);
            }
        }
        else {
            this.logger.success('Sin anomalias detectadas.');
        }
        this.logger.info('');
        this.logger.info('Backfill completado.');
    }
}
__decorate([
    flags.boolean({
        description: 'Confirma explicitamente la ejecucion cuando NODE_ENV=production',
    }),
    __metadata("design:type", Boolean)
], FinancieroBackfill.prototype, "confirmProduction", void 0);
//# sourceMappingURL=financiero_backfill.js.map