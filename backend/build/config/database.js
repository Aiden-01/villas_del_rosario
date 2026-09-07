import env from '#start/env';
import { defineConfig } from '@adonisjs/lucid';
if (env.get('NODE_ENV') === 'test' &&
    (env.get('DB_DATABASE') !== 'villas_del_rosario_test' ||
        !['127.0.0.1', 'localhost', '::1'].includes(env.get('DB_HOST')) ||
        Number(env.get('DB_PORT')) === 5432)) {
    throw new Error('Tests bloqueados: se requiere PostgreSQL local villas_del_rosario_test (NO usar puerto 5432 de produccion)');
}
const dbConfig = defineConfig({
    connection: 'postgres',
    connections: {
        postgres: {
            client: 'pg',
            connection: {
                host: env.get('DB_HOST'),
                port: env.get('DB_PORT'),
                user: env.get('DB_USER'),
                password: env.get('DB_PASSWORD'),
                database: env.get('DB_DATABASE'),
            },
            searchPath: ['public'],
            migrations: {
                naturalSort: true,
                paths: ['database/migrations'],
            },
        },
    },
});
export default dbConfig;
//# sourceMappingURL=database.js.map