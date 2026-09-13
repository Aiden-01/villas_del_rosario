var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { BaseCommand, flags } from '@adonisjs/core/ace';
import { importarGeometriasLotesDesdeArchivo } from '#services/importar_lotes_geometrias_service';
export default class ImportarLotesGeometrias extends BaseCommand {
    static commandName = 'lotes:importar-geometrias';
    static description = 'Valida e importa las geometrías GeoJSON de los lotes existentes';
    static options = {
        startApp: true,
    };
    async run() {
        const rutaArchivo = this.app.makePath('database/geo/lotes_villas_rosario.geojson');
        try {
            const resultado = await importarGeometriasLotesDesdeArchivo(rutaArchivo, {
                dryRun: this.dryRun,
            });
            this.logger.info('Lote | Código | Área sistema | Área fuente | Resultado');
            for (const fila of resultado.filas) {
                this.logger.info(`${fila.lote} | ${fila.codigo} | ${fila.areaSistema.toFixed(2)} m2 | ${fila.areaFuente.toFixed(2)} m2 | ${fila.resultado}`);
            }
            if (resultado.dryRun) {
                this.logger.success(`Dry-run correcto: ${resultado.total} lotes listos; no se guardaron filas.`);
            }
            else {
                this.logger.success(`Importación completada: ${resultado.total} geometrías guardadas.`);
            }
        }
        catch (error) {
            const mensaje = error instanceof Error ? error.message : String(error);
            this.logger.error(`Importación abortada: ${mensaje}`);
            this.exitCode = 1;
        }
    }
}
__decorate([
    flags.boolean({ description: 'Valida y muestra el resultado sin guardar geometrías' }),
    __metadata("design:type", Boolean)
], ImportarLotesGeometrias.prototype, "dryRun", void 0);
//# sourceMappingURL=importar_lotes_geometrias.js.map