import User from '#models/user';
import ApiToken from '#models/api_token';
import Hash from '@adonisjs/core/services/hash';
import { randomUUID } from 'node:crypto';
function serializeUser(user) {
    return {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
    };
}
export default class AuthController {
    async issueTokenPair(user) {
        const accessTokenValue = randomUUID().replace(/-/g, '');
        const refreshTokenValue = randomUUID().replace(/-/g, '') + randomUUID().replace(/-/g, '');
        const accessToken = await user.related('apiTokens').create({
            type: 'access',
            token: accessTokenValue,
            expiresAt: null,
        });
        const refreshToken = await user.related('apiTokens').create({
            type: 'refresh',
            token: refreshTokenValue,
            expiresAt: null,
        });
        return {
            type: 'bearer',
            token: accessToken.token,
            expiresAt: accessToken.expiresAt,
            refreshToken: refreshToken.token,
            refreshExpiresAt: refreshToken.expiresAt,
            user: serializeUser(user),
        };
    }
    async login({ request, response }) {
        const { username, password } = request.only(['username', 'password']);
        try {
            const user = await User.findBy('username', username);
            if (!user) {
                return response.unauthorized({
                    message: 'Credenciales incorrectas',
                });
            }
            const isValid = await Hash.verify(user.password, password);
            if (!isValid) {
                return response.unauthorized({
                    message: 'Credenciales incorrectas',
                });
            }
            await user.related('apiTokens').query().whereIn('type', ['api', 'access', 'refresh']).delete();
            return this.issueTokenPair(user);
        }
        catch (error) {
            console.error('Login error:', error);
            return response.unauthorized({
                message: 'Error en el servidor',
            });
        }
    }
    async refresh({ request, response }) {
        const refreshTokenValue = request.input('refreshToken');
        if (!refreshTokenValue) {
            return response.unauthorized({ message: 'Refresh token requerido' });
        }
        const refreshToken = await ApiToken.query()
            .where('token', refreshTokenValue)
            .where('type', 'refresh')
            .preload('user')
            .first();
        if (!refreshToken?.user) {
            return response.unauthorized({ message: 'Sesion invalida' });
        }
        const user = refreshToken.user;
        await refreshToken.delete();
        await user.related('apiTokens').query().where('type', 'access').delete();
        return this.issueTokenPair(user);
    }
    async logout({ request, response }) {
        const authHeader = request.header('authorization');
        const token = authHeader?.replace('Bearer ', '').trim();
        const refreshToken = request.input('refreshToken');
        if (token) {
            await ApiToken.query().where('token', token).delete();
        }
        if (refreshToken) {
            await ApiToken.query().where('token', refreshToken).delete();
        }
        return response.ok({ message: 'Sesion cerrada' });
    }
}
//# sourceMappingURL=auth_controller.js.map