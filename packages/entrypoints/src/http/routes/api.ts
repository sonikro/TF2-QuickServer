import { Express } from 'express';
import { profileHandler } from '../middlewares/profile';

export function registerApiRoutes(app: Express) {
    app.get('/api/profile', profileHandler);
}
