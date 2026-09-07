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
import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm';
import Prestamo from '#models/prestamo';
import User from '#models/user';
import PagoAplicacion from '#models/pago_aplicacion';
export default class Pago extends BaseModel {
    static table = 'pagos';
}
__decorate([
    column({ isPrimary: true }),
    __metadata("design:type", Number)
], Pago.prototype, "id", void 0);
__decorate([
    column({ columnName: 'venta_id' }),
    __metadata("design:type", Number)
], Pago.prototype, "prestamoId", void 0);
__decorate([
    column(),
    __metadata("design:type", Object)
], Pago.prototype, "usuarioId", void 0);
__decorate([
    column(),
    __metadata("design:type", Number)
], Pago.prototype, "numeroCuota", void 0);
__decorate([
    column(),
    __metadata("design:type", Number)
], Pago.prototype, "montoPagado", void 0);
__decorate([
    column(),
    __metadata("design:type", String)
], Pago.prototype, "tipoPago", void 0);
__decorate([
    column.date(),
    __metadata("design:type", DateTime)
], Pago.prototype, "fechaPago", void 0);
__decorate([
    column.dateTime({ autoCreate: true }),
    __metadata("design:type", DateTime)
], Pago.prototype, "createdAt", void 0);
__decorate([
    column(),
    __metadata("design:type", Boolean)
], Pago.prototype, "anulado", void 0);
__decorate([
    column.dateTime(),
    __metadata("design:type", Object)
], Pago.prototype, "anuladoAt", void 0);
__decorate([
    column(),
    __metadata("design:type", Object)
], Pago.prototype, "anuladoPor", void 0);
__decorate([
    column(),
    __metadata("design:type", Object)
], Pago.prototype, "motivoAnulacion", void 0);
__decorate([
    belongsTo(() => Prestamo, {
        foreignKey: 'prestamoId',
    }),
    __metadata("design:type", Object)
], Pago.prototype, "prestamo", void 0);
__decorate([
    belongsTo(() => User, {
        foreignKey: 'usuarioId',
    }),
    __metadata("design:type", Object)
], Pago.prototype, "usuario", void 0);
__decorate([
    belongsTo(() => User, {
        foreignKey: 'anuladoPor',
    }),
    __metadata("design:type", Object)
], Pago.prototype, "anuladoPorUsuario", void 0);
__decorate([
    hasMany(() => PagoAplicacion, {
        foreignKey: 'pagoId',
    }),
    __metadata("design:type", Object)
], Pago.prototype, "aplicaciones", void 0);
//# sourceMappingURL=pago.js.map