import express, { Express, RequestHandler } from 'express';
import { logger } from '@tf2qs/telemetry';
import { registerHealthCheckMiddleware } from './middlewares/healthCheck';
import { createValidateJwtMiddleware } from './middlewares/validateJwt';
import { registerApiRoutes, ApiRouteDependencies } from './routes/api';

export type ExpressOptions = {
    apiDependencies: ApiRouteDependencies;
    authMiddlewareOverride?: RequestHandler;
};

export function initializeExpress(options: ExpressOptions): Express {
    const app = express();
    const PORT = process.env.HTTP_PORT || 3000;

    app.use(express.json());

    registerHealthCheckMiddleware(app);

    const jwtMiddleware = options.authMiddlewareOverride ?? createValidateJwtMiddleware({
        auth0Domain: process.env.AUTH0_DOMAIN || '',
        auth0Audience: process.env.AUTH0_AUDIENCE || '',
    });

    app.use('/api', jwtMiddleware);

    registerApiRoutes(app, options.apiDependencies);

    if (process.env.NODE_ENV !== 'test') {
        app.listen(PORT, () => {
            logger.emit({ severityText: 'INFO', body: `🚀 TF2-QuickServer listening at http://localhost:${PORT}/` });
        });
    }

    return app;
}