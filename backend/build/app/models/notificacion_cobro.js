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
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm';
import Prestamo from '#models/prestamo';
export default class NotificacionCobro extends BaseModel {
    static table = 'notificaciones_cobros';
}
__decorate([
    column({ isPrimary: true }),
    __metadata("design:type", Number)
], NotificacionCobro.prototype, "id", void 0);
__decorate([
    column({ columnName: 'venta_id' }),
    __metadata("design:type", Number)
], NotificacionCobro.prototype, "prestamoId", void 0);
__decorate([
    column(),
    __metadata("design:type", Number)
], NotificacionCobro.prototype, "numeroCuota", void 0);
__decorate([
    column.date({ columnName: 'fecha_programada' }),
    __metadata("design:type", DateTime)
], NotificacionCobro.prototype, "fechaProgramada", void 0);
__decorate([
    column(),
    __metadata("design:type", String)
], NotificacionCobro.prototype, "canal", void 0);
__decorate([
    column.dateTime({ columnName: 'sent_at' }),
    __metadata("design:type", Object)
], NotificacionCobro.prototype, "sentAt", void 0);
__decorate([
    column.dateTime({ autoCreate: true }),
    __metadata("design:type", DateTime)
], NotificacionCobro.prototype, "createdAt", void 0);
__decorate([
    column.dateTime({ autoCreate: true, autoUpdate: true }),
    __metadata("design:type", Object)
], NotificacionCobro.prototype, "updatedAt", void 0);
__decorate([
    belongsTo(() => Prestamo, {
        foreignKey: 'prestamoId',
    }),
    __metadata("design:type", Object)
], NotificacionCobro.prototype, "prestamo", void 0);
//# sourceMappingURL=notificacion_cobro.js.map