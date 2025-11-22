import { Request, Response } from 'express';

export function profileHandler(req: Request, res: Response): void {
    if (!req.auth) {
        res.status(401).json({
            error: 'Unauthorized',
            message: 'No authentication information found'
        });
        return;
    }

    res.json({
        clientId: req.auth.payload.azp || req.auth.payload.sub,
        issuer: req.auth.payload.iss,
        audience: req.auth.payload.aud,
        scope: req.auth.payload.scope,
        permissions: req.auth.payload.permissions || []
    });
}
