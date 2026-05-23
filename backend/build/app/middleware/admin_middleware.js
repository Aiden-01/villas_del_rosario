export default class AdminMiddleware {
    async handle(ctx, next) {
        if (!ctx.currentUser || ctx.currentUser.role !== 'admin') {
            return ctx.response.forbidden({ message: 'No tienes permisos' });
        }
        return next();
    }
}
//# sourceMappingURL=admin_middleware.js.map