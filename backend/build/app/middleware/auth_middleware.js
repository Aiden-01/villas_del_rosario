import ApiToken from '#models/api_token';
export default class AuthMiddleware {
    async handle(ctx, next) {
        const authHeader = ctx.request.header('authorization');
        const token = authHeader?.replace('Bearer ', '').trim();
        if (!token) {
            return ctx.response.unauthorized({ message: 'No autorizado' });
        }
        const apiToken = await ApiToken.query()
            .where('token', token)
            .whereIn('type', ['api', 'access'])
            .preload('user')
            .first();
        if (!apiToken?.user) {
            return ctx.response.unauthorized({ message: 'No autorizado' });
        }
        ctx.currentUser = apiToken.user;
        return next();
    }
}
//# sourceMappingURL=auth_middleware.js.map