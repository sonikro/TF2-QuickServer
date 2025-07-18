import express, { Express } from 'express';
import { logger } from '../../telemetry/otel';
import { registerHealthCheckMiddleware } from './middleware/healthCheck';

export function initializeExpress(dependencies: {}): Express {
    const { } = dependencies;
    const app = express();
    const PORT = process.env.HTTP_PORT || 3000;

    // Register health check middleware
    registerHealthCheckMiddleware(app);

    if (process.env.NODE_ENV !== 'test') {
        app.listen(PORT, () => {
            logger.emit({ severityText: 'INFO', body: `🚀 TF2-QuickServer listening at http://localhost:${PORT}/` });
        });
    }

    return app;
}