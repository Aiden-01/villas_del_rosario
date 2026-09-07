var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { DateTime } from 'luxon';
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm';
import Pago from '#models/pago';
import Prestamo from '#models/prestamo';
export default class PagoAplicacion extends BaseModel {
    static table = 'pago_aplicaciones';
}
__decorate([
    column({ isPrimary: true }),
    __metadata("design:type", Number)
], PagoAplicacion.prototype, "id", void 0);
__decorate([
    column(),
    __metadata("design:type", Number)
], PagoAplicacion.prototype, "pagoId", void 0);
__decorate([
    column({ columnName: 'venta_id' }),
    __metadata("design:type", Number)
], PagoAplicacion.prototype, "ventaId", void 0);
__decorate([
    column(),
    __metadata("design:type", Number)
], PagoAplicacion.prototype, "numeroCuota", void 0);
__decorate([
    column(),
    __metadata("design:type", Number)
], PagoAplicacion.prototype, "montoAplicado", void 0);
__decorate([
    column.dateTime({ autoCreate: true }),
    __metadata("design:type", DateTime)
], PagoAplicacion.prototype, "createdAt", void 0);
__decorate([
    belongsTo(() => Pago, { foreignKey: 'pagoId' }),
    __metadata("design:type", Object)
], PagoAplicacion.prototype, "pago", void 0);
__decorate([
    belongsTo(() => Prestamo, { foreignKey: 'ventaId' }),
    __metadata("design:type", Object)
], PagoAplicacion.prototype, "venta", void 0);
//# sourceMappingURL=pago_aplicacion.js.map