import { Express, Request, Response } from 'express';

export function registerHealthCheckMiddleware(app: Express) {
    app.get('/healthz', (_req: Request, res: Response) => {
        res.status(200).send('ok');
    });
}
