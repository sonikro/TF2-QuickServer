import { NextFunction, Request, RequestHandler, Response } from 'express';
import { logger } from '@tf2qs/telemetry';

export function createRequireScopeMiddleware(requiredScope: string): RequestHandler {
    return (req: Request, res: Response, next: NextFunction) => {
        const payload = req.auth?.payload;
        const scope = payload?.scope;
        const permissions = payload?.permissions;

        const scopes = typeof scope === 'string' ? scope.split(' ') : [];
        const permissionList = Array.isArray(permissions)
            ? (permissions as unknown[]).filter((permission): permission is string => typeof permission === 'string')
            : [];

        if (!scopes.includes(requiredScope) && !permissionList.includes(requiredScope)) {
            const clientId = [payload?.azp, payload?.sub].find((value): value is string => typeof value === 'string');
            logger.emit({
                severityText: 'WARN',
                body: 'Forbidden: missing required scope',
                attributes: {
                    requiredScope,
                    path: req.path,
                    method: req.method,
                    clientId,
                },
            });
            res.status(403).json({
                error: 'Forbidden',
                message: `Missing required scope: ${requiredScope}`,
            });
            return;
        }

        next();
    };
}