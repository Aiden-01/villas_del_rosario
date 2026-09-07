import { verificarEntornoFinancieroLocal } from '#services/local_financiero_guard';
import { assert } from '@japa/assert';
import { apiClient } from '@japa/api-client';
import app from '@adonisjs/core/services/app';
import { pluginAdonisJS } from '@japa/plugin-adonisjs';
import testUtils from '@adonisjs/core/services/test_utils';
export const plugins = [assert(), apiClient(), pluginAdonisJS(app)];
export const runnerHooks = {
    setup: [
        () => {
            console.log(verificarEntornoFinancieroLocal(true));
        },
    ],
    teardown: [],
};
export const configureSuite = (suite) => {
    if (['browser', 'functional', 'e2e'].includes(suite.name)) {
        return suite.setup(() => testUtils.httpServer().start());
    }
};
//# sourceMappingURL=bootstrap.js.map