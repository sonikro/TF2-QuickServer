import { Express } from 'express';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { profileHandler } from '../middlewares/profile';
import { createRequireScopeMiddleware } from '../middlewares/requireScope';
import { createListServersHandler } from './servers/listServers';
import { createCreateServerHandler } from './servers/createServer';
import { createDeleteServerHandler } from './servers/deleteServer';
import { createGetTaskStatusHandler } from './tasks/getTaskStatus';
import { createGetSourceTvInfoHandler } from './sourcetv/getSourceTvInfo';
import { BackgroundTaskQueue, GetUserServers, GetSourceTvInfo, ServerRepository } from '@tf2qs/core';
import { swaggerOptions } from './swaggerOptions';

const swaggerSpec = swaggerJsdoc(swaggerOptions);

export type ApiRouteDependencies = {
    getUserServers: GetUserServers;
    backgroundTaskQueue: BackgroundTaskQueue;
    serverRepository: ServerRepository;
    getSourceTvInfo: GetSourceTvInfo;
};

export function registerApiRoutes(app: Express, dependencies: ApiRouteDependencies) {
    app.get('/api/profile', profileHandler);

    app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
    app.get('/api/openapi.json', (_req, res) => { res.json(swaggerSpec); });

    const { getUserServers, backgroundTaskQueue, serverRepository, getSourceTvInfo } = dependencies;
    app.get('/api/servers', createRequireScopeMiddleware('manage:servers'), createListServersHandler(getUserServers));
    app.post('/api/servers', createRequireScopeMiddleware('manage:servers'), createCreateServerHandler(backgroundTaskQueue));
    app.delete('/api/servers/:serverId', createRequireScopeMiddleware('manage:servers'), createDeleteServerHandler(backgroundTaskQueue, serverRepository));
    app.get('/api/tasks/:taskId', createRequireScopeMiddleware('manage:servers'), createGetTaskStatusHandler(backgroundTaskQueue));
    app.get('/api/sourcetv-connections', createRequireScopeMiddleware('read:sourcetv:all'), createGetSourceTvInfoHandler(getSourceTvInfo));
}

