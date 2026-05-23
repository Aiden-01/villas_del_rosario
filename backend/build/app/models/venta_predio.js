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
import { BaseModel, belongsTo, column, computed } from '@adonisjs/lucid/orm';
import Prestamo from '#models/prestamo';
import Lote from '#models/lote';
export default class VentaPredio extends BaseModel {
    static table = 'venta_predios';
    get numeroLote() {
        return this.lote?.numero ?? null;
    }
    get medidaLote() {
        return this.lote?.medida ?? null;
    }
    get areaLote() {
        return this.lote?.area ?? null;
    }
}
__decorate([
    column({ isPrimary: true }),
    __metadata("design:type", Number)
], VentaPredio.prototype, "id", void 0);
__decorate([
    column(),
    __metadata("design:type", Number)
], VentaPredio.prototype, "ventaId", void 0);
__decorate([
    column(),
    __metadata("design:type", Object)
], VentaPredio.prototype, "loteId", void 0);
__decorate([
    column(),
    __metadata("design:type", Object)
], VentaPredio.prototype, "precio", void 0);
__decorate([
    column.dateTime({ autoCreate: true }),
    __metadata("design:type", DateTime)
], VentaPredio.prototype, "createdAt", void 0);
__decorate([
    column.dateTime({ autoCreate: true, autoUpdate: true }),
    __metadata("design:type", Object)
], VentaPredio.prototype, "updatedAt", void 0);
__decorate([
    belongsTo(() => Prestamo, {
        foreignKey: 'ventaId',
    }),
    __metadata("design:type", Object)
], VentaPredio.prototype, "venta", void 0);
__decorate([
    belongsTo(() => Lote, {
        foreignKey: 'loteId',
    }),
    __metadata("design:type", Object)
], VentaPredio.prototype, "lote", void 0);
__decorate([
    computed({ serializeAs: 'numeroLote' }),
    __metadata("design:type", Object),
    __metadata("design:paramtypes", [])
], VentaPredio.prototype, "numeroLote", null);
__decorate([
    computed({ serializeAs: 'medidaLote' }),
    __metadata("design:type", Object),
    __metadata("design:paramtypes", [])
], VentaPredio.prototype, "medidaLote", null);
__decorate([
    computed({ serializeAs: 'areaLote' }),
    __metadata("design:type", Object),
    __metadata("design:paramtypes", [])
], VentaPredio.prototype, "areaLote", null);
//# sourceMappingURL=venta_predio.js.map