var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm';
import Prestamo from '#models/prestamo';
export default class Client extends BaseModel {
    static table = 'clientes';
}
__decorate([
    column({ isPrimary: true }),
    __metadata("design:type", Number)
], Client.prototype, "id", void 0);
__decorate([
    column(),
    __metadata("design:type", String)
], Client.prototype, "nombres", void 0);
__decorate([
    column(),
    __metadata("design:type", String)
], Client.prototype, "apellidos", void 0);
__decorate([
    column(),
    __metadata("design:type", String)
], Client.prototype, "telefono", void 0);
__decorate([
    column(),
    __metadata("design:type", String)
], Client.prototype, "direccion", void 0);
__decorate([
    column(),
    __metadata("design:type", Object)
], Client.prototype, "zona", void 0);
__decorate([
    hasMany(() => Prestamo, {
        foreignKey: 'clienteId',
    }),
    __metadata("design:type", Object)
], Client.prototype, "prestamos", void 0);
//# sourceMappingURL=client.js.map