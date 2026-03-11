import { Express } from 'express';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { profileHandler } from '../middlewares/profile';
import { createListServersHandler } from './servers/listServers';
import { createCreateServerHandler } from './servers/createServer';
import { createDeleteServerHandler } from './servers/deleteServer';
import { createGetTaskStatusHandler } from './tasks/getTaskStatus';
import { BackgroundTaskQueue, GetUserServers, ServerRepository } from '@tf2qs/core';
import { swaggerOptions } from './swaggerOptions';

const swaggerSpec = swaggerJsdoc(swaggerOptions);

export type ApiRouteDependencies = {
    getUserServers: GetUserServers;
    backgroundTaskQueue: BackgroundTaskQueue;
    serverRepository: ServerRepository;
};

export function registerApiRoutes(app: Express, dependencies: ApiRouteDependencies) {
    app.get('/api/profile', profileHandler);

    app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
    app.get('/api/openapi.json', (_req, res) => { res.json(swaggerSpec); });

    const { getUserServers, backgroundTaskQueue, serverRepository } = dependencies;
    app.get('/api/servers', createListServersHandler(getUserServers));
    app.post('/api/servers', createCreateServerHandler(backgroundTaskQueue));
    app.delete('/api/servers/:serverId', createDeleteServerHandler(backgroundTaskQueue, serverRepository));
    app.get('/api/tasks/:taskId', createGetTaskStatusHandler(backgroundTaskQueue));
}

