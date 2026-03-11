import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { initializeExpress } from './express';
import { BackgroundTaskQueue, GetUserServers, ServerRepository } from '@tf2qs/core';

function makeDeps() {
    return {
        getUserServers: mock<GetUserServers>(),
        backgroundTaskQueue: mock<BackgroundTaskQueue>(),
        serverRepository: mock<ServerRepository>(),
    };
}

describe("initializeExpress", () => {

    let app: ReturnType<typeof initializeExpress>;

    describe("without Auth0 configuration", () => {
        beforeEach(() => {
            vi.clearAllMocks();
            delete process.env.AUTH0_DOMAIN;
            delete process.env.AUTH0_AUDIENCE;
            app = initializeExpress({ apiDependencies: makeDeps() });
        });

        it.each([
            { endpoint: '/healthz', description: 'health check' }
        ])('should allow access to $description without authentication', async ({ endpoint }) => {
            const response = await request(app).get(endpoint);
            expect(response.status).toBe(200);
        });
    });

    describe("with Auth0 configuration", () => {
        beforeEach(() => {
            vi.clearAllMocks();
            process.env.AUTH0_DOMAIN = 'test.auth0.com';
            process.env.AUTH0_AUDIENCE = 'https://api.test.com';
            app = initializeExpress({ apiDependencies: makeDeps() });
        });

        it.each([
            { endpoint: '/healthz', description: 'health check' }
        ])('should allow access to public $description without authentication', async ({ endpoint }) => {
            const response = await request(app).get(endpoint);
            expect(response.status).toBe(200);
        });

        it.each([
            { endpoint: '/api/profile', description: 'API profile' }
        ])('should return 401 for protected $description without token', async ({ endpoint }) => {
            const response = await request(app).get(endpoint);
            expect(response.status).toBe(401);
            expect(response.body).toMatchObject({
                error: 'Unauthorized'
            });
        });
    });

});
