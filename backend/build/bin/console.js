import 'reflect-metadata';
import { Ignitor, prettyPrintError } from '@adonisjs/core';
import { esComandoConBloqueoDeProduccion, verificarComandoSeguroEnProduccion, } from '#services/production_command_guard';
const APP_ROOT = new URL('../', import.meta.url);
const IMPORTER = (filePath) => {
    if (filePath.startsWith('./') || filePath.startsWith('../')) {
        return import(new URL(filePath, APP_ROOT).href);
    }
    return import(filePath);
};
const commandArgs = process.argv.slice(2);
try {
    if (esComandoConBloqueoDeProduccion(commandArgs)) {
        const { default: env } = await import('#start/env');
        verificarComandoSeguroEnProduccion(commandArgs, env.get('NODE_ENV'));
    }
    new Ignitor(APP_ROOT, { importer: IMPORTER })
        .tap((app) => {
        app.booting(async () => {
            await import('#start/env');
        });
        app.listen('SIGTERM', () => app.terminate());
        app.listenIf(app.managedByPm2, 'SIGINT', () => app.terminate());
    })
        .ace()
        .handle(commandArgs)
        .catch((error) => {
        process.exitCode = 1;
        prettyPrintError(error);
    });
}
catch (error) {
    process.exitCode = 1;
    prettyPrintError(error);
}
//# sourceMappingURL=console.js.map