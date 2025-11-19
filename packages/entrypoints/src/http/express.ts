import express, { Express } from 'express';
import { logger } from '@tf2qs/telemetry/src/otel';
import { registerHealthCheckMiddleware } from './middlewares/healthCheck';
import { createValidateJwtMiddleware } from './middlewares/validateJwt';
import { registerApiRoutes } from './routes/api';

export function initializeExpress(dependencies: {}): Express {
    const app = express();
    const PORT = process.env.HTTP_PORT || 3000;

    app.use(express.json());

    registerHealthCheckMiddleware(app);

    const validateJwt = createValidateJwtMiddleware({
        auth0Domain: process.env.AUTH0_DOMAIN || '',
        auth0Audience: process.env.AUTH0_AUDIENCE || ''
    });

    app.use('/api', validateJwt);

    registerApiRoutes(app);

    if (process.env.NODE_ENV !== 'test') {
        app.listen(PORT, () => {
            logger.emit({ severityText: 'INFO', body: `🚀 TF2-QuickServer listening at http://localhost:${PORT}/` });
        });
    }

    return app;
}