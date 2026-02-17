"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = handler;
const app_bootstrap_1 = require("../src/app-bootstrap");
let cachedHandler = null;
async function getHandler() {
    if (cachedHandler)
        return cachedHandler;
    const app = await (0, app_bootstrap_1.createApp)();
    await app.init();
    const expressApp = app.getHttpAdapter().getInstance();
    cachedHandler = expressApp;
    return cachedHandler;
}
async function handler(req, res) {
    try {
        const expressHandler = await getHandler();
        expressHandler(req, res);
    }
    catch (err) {
        console.error('[api] FUNCTION_INVOCATION_FAILED', err);
        if (!res.headersSent) {
            res.status(500).json({
                error: 'FUNCTION_INVOCATION_FAILED',
                message: err instanceof Error ? err.message : 'Internal Server Error',
            });
        }
    }
}
//# sourceMappingURL=index.js.map