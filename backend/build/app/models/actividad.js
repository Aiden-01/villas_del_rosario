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
import User from '#models/user';
export default class Actividad extends BaseModel {
    static table = 'actividades';
}
__decorate([
    column({ isPrimary: true }),
    __metadata("design:type", Number)
], Actividad.prototype, "id", void 0);
__decorate([
    column(),
    __metadata("design:type", Object)
], Actividad.prototype, "usuarioId", void 0);
__decorate([
    column(),
    __metadata("design:type", String)
], Actividad.prototype, "tipo", void 0);
__decorate([
    column(),
    __metadata("design:type", String)
], Actividad.prototype, "entidad", void 0);
__decorate([
    column(),
    __metadata("design:type", Object)
], Actividad.prototype, "entidadId", void 0);
__decorate([
    column(),
    __metadata("design:type", String)
], Actividad.prototype, "descripcion", void 0);
__decorate([
    column(),
    __metadata("design:type", Object)
], Actividad.prototype, "detalle", void 0);
__decorate([
    column.dateTime({ autoCreate: true }),
    __metadata("design:type", DateTime)
], Actividad.prototype, "createdAt", void 0);
__decorate([
    belongsTo(() => User, {
        foreignKey: 'usuarioId',
    }),
    __metadata("design:type", Object)
], Actividad.prototype, "usuario", void 0);
//# sourceMappingURL=actividad.js.map