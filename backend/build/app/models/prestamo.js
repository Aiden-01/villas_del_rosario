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
import { BaseModel, column, belongsTo, hasMany, computed } from '@adonisjs/lucid/orm';
import Client from '#models/client';
import Pago from '#models/pago';
import Lote from '#models/lote';
import ProgramacionPago from '#models/programacion_pago';
import VentaPredio from '#models/venta_predio';
import PagoAplicacion from '#models/pago_aplicacion';
export default class Prestamo extends BaseModel {
    static table = 'ventas';
    get numeroLote() {
        const predios = this.$preloaded.predios || [];
        if (predios.length > 0) {
            return predios
                .map((predio) => predio.numeroLote)
                .filter(Boolean)
                .join(', ');
        }
        return this.lote?.numero ?? null;
    }
    get medidaLote() {
        const predios = this.$preloaded.predios || [];
        if (predios.length > 0) {
            return predios
                .map((predio) => predio.medidaLote)
                .filter(Boolean)
                .join(', ');
        }
        return this.lote?.medida ?? null;
    }
    get areaLote() {
        const predios = this.$preloaded.predios || [];
        if (predios.length > 0) {
            return predios
                .map((predio) => predio.areaLote)
                .filter(Boolean)
                .join(', ');
        }
        return this.lote?.area ?? null;
    }
}
__decorate([
    column({ isPrimary: true }),
    __metadata("design:type", Number)
], Prestamo.prototype, "id", void 0);
__decorate([
    column(),
    __metadata("design:type", Number)
], Prestamo.prototype, "clienteId", void 0);
__decorate([
    column(),
    __metadata("design:type", Object)
], Prestamo.prototype, "loteId", void 0);
__decorate([
    column(),
    __metadata("design:type", Number)
], Prestamo.prototype, "monto", void 0);
__decorate([
    column(),
    __metadata("design:type", Number)
], Prestamo.prototype, "cuotas", void 0);
__decorate([
    column.date(),
    __metadata("design:type", DateTime)
], Prestamo.prototype, "fechaInicio", void 0);
__decorate([
    column.date(),
    __metadata("design:type", DateTime)
], Prestamo.prototype, "fechaFin", void 0);
__decorate([
    column(),
    __metadata("design:type", String)
], Prestamo.prototype, "estado", void 0);
__decorate([
    column(),
    __metadata("design:type", Object)
], Prestamo.prototype, "frecuenciaPago", void 0);
__decorate([
    column.date(),
    __metadata("design:type", Object)
], Prestamo.prototype, "fechaCobro", void 0);
__decorate([
    column.dateTime({ autoCreate: true }),
    __metadata("design:type", DateTime)
], Prestamo.prototype, "createdAt", void 0);
__decorate([
    column.dateTime({ autoCreate: true, autoUpdate: true }),
    __metadata("design:type", Object)
], Prestamo.prototype, "updatedAt", void 0);
__decorate([
    column.dateTime(),
    __metadata("design:type", Object)
], Prestamo.prototype, "canceladoAt", void 0);
__decorate([
    column(),
    __metadata("design:type", Object)
], Prestamo.prototype, "canceladoPor", void 0);
__decorate([
    column(),
    __metadata("design:type", Object)
], Prestamo.prototype, "motivoCancelacion", void 0);
__decorate([
    belongsTo(() => Client, {
        foreignKey: 'clienteId',
    }),
    __metadata("design:type", Object)
], Prestamo.prototype, "cliente", void 0);
__decorate([
    belongsTo(() => Lote, {
        foreignKey: 'loteId',
    }),
    __metadata("design:type", Object)
], Prestamo.prototype, "lote", void 0);
__decorate([
    hasMany(() => Pago, {
        foreignKey: 'prestamoId',
    }),
    __metadata("design:type", Object)
], Prestamo.prototype, "pagos", void 0);
__decorate([
    hasMany(() => ProgramacionPago, {
        foreignKey: 'prestamoId',
    }),
    __metadata("design:type", Object)
], Prestamo.prototype, "programaciones", void 0);
__decorate([
    hasMany(() => VentaPredio, {
        foreignKey: 'ventaId',
    }),
    __metadata("design:type", Object)
], Prestamo.prototype, "predios", void 0);
__decorate([
    hasMany(() => PagoAplicacion, {
        foreignKey: 'ventaId',
    }),
    __metadata("design:type", Object)
], Prestamo.prototype, "pagoAplicaciones", void 0);
__decorate([
    computed({ serializeAs: 'numeroLote' }),
    __metadata("design:type", Object),
    __metadata("design:paramtypes", [])
], Prestamo.prototype, "numeroLote", null);
__decorate([
    computed({ serializeAs: 'medidaLote' }),
    __metadata("design:type", Object),
    __metadata("design:paramtypes", [])
], Prestamo.prototype, "medidaLote", null);
__decorate([
    computed({ serializeAs: 'areaLote' }),
    __metadata("design:type", Object),
    __metadata("design:paramtypes", [])
], Prestamo.prototype, "areaLote", null);
//# sourceMappingURL=prestamo.js.map