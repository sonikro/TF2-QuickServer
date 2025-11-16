import { auth, UnauthorizedError } from 'express-oauth2-jwt-bearer';
import { NextFunction, Request, Response } from 'express';
import { logger } from '../../../telemetry/otel';

export type ValidateJwtDependencies = {
    auth0Domain: string;
    auth0Audience: string;
};

export function createValidateJwtMiddleware(dependencies: ValidateJwtDependencies) {
    const { auth0Domain, auth0Audience } = dependencies;

    if (!auth0Domain || !auth0Audience) {
        logger.emit({
            severityText: 'WARN',
            body: 'Auth0 configuration missing. JWT validation will be disabled.',
            attributes: {
                auth0Domain,
                auth0Audience
            }
        });
        return (req: Request, res: Response, next: NextFunction) => next();
    }

    const jwtCheck = auth({
        audience: auth0Audience,
        issuerBaseURL: `https://${auth0Domain}`,
        tokenSigningAlg: 'RS256'
    });

    return (req: Request, res: Response, next: NextFunction) => {
        jwtCheck(req, res, (err) => {
            if (err) {
                if (err instanceof UnauthorizedError) {
                    logger.emit({
                        severityText: 'WARN',
                        body: 'Unauthorized access attempt',
                        attributes: {
                            error: err.message,
                            status: err.status,
                            path: req.path
                        }
                    });
                    return res.status(401).json({
                        error: 'Unauthorized',
                        message: 'Invalid or missing authentication token'
                    });
                }

                logger.emit({
                    severityText: 'ERROR',
                    body: 'JWT validation error',
                    attributes: {
                        error: JSON.stringify(err, Object.getOwnPropertyNames(err)),
                        path: req.path
                    }
                });
                return res.status(500).json({
                    error: 'Internal Server Error',
                    message: 'Authentication validation failed'
                });
            }
            next();
        });
    };
}
