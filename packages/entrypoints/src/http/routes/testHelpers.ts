import { Request, Response, NextFunction } from 'express';
import { mock } from 'vitest-mock-extended';
import { GetUserServers, BackgroundTaskQueue, ServerRepository, Server } from '@tf2qs/core';
import { Region } from '@tf2qs/core';
import { initializeExpress } from '../express';

export const TEST_CLIENT_ID = 'test-client-abc123';

export function injectAuth(clientId: string) {
    return (req: Request, _res: Response, next: NextFunction) => {
        (req as any).auth = { payload: { azp: clientId, sub: clientId } };
        next();
    };
}

export function makeServer(overrides: Partial<Server> = {}): Server {
    return {
        serverId: 'server-xyz',
        region: 'us-east-1' as Region,
        variant: 'standard-competitive' as Server['variant'],
        hostIp: '1.2.3.4',
        hostPort: 27015,
        tvIp: '1.2.3.4',
        tvPort: 27020,
        rconPassword: 'rcon123',
        hostPassword: 'pass123',
        tvPassword: 'tv123',
        rconAddress: '1.2.3.4:27015',
        status: 'ready',
        createdBy: TEST_CLIENT_ID,
        ...overrides,
    };
}

export function makeSut() {
    const getUserServers = mock<GetUserServers>();
    const backgroundTaskQueue = mock<BackgroundTaskQueue>();
    const serverRepository = mock<ServerRepository>();

    const app = initializeExpress({
        apiDependencies: { getUserServers, backgroundTaskQueue, serverRepository },
        authMiddlewareOverride: injectAuth(TEST_CLIENT_ID),
    });

    return { app, getUserServers, backgroundTaskQueue, serverRepository };
}
