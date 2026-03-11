import request from 'supertest';
import { describe, it, expect } from 'vitest';
import { when } from 'vitest-when';
import { makeSut, makeServer, TEST_CLIENT_ID } from '../testHelpers';

describe('GET /api/servers', () => {
    it('should return the list of servers for the authenticated client', async () => {
        // Given
        const { app, getUserServers } = makeSut();
        const servers = [makeServer()];
        when(getUserServers.execute).calledWith({ userId: TEST_CLIENT_ID }).thenResolve(servers);

        // When
        const response = await request(app).get('/api/servers');

        // Then
        expect(response.status).toBe(200);
        expect(response.body).toHaveLength(1);
    });

    it('should return full server credentials in the response', async () => {
        // Given
        const { app, getUserServers } = makeSut();
        const server = makeServer();
        when(getUserServers.execute).calledWith(expect.anything()).thenResolve([server]);

        // When
        const response = await request(app).get('/api/servers');

        // Then
        expect(response.status).toBe(200);
        expect(response.body[0]).toMatchObject({
            serverId: server.serverId,
            rconPassword: server.rconPassword,
            hostPassword: server.hostPassword,
            tvPassword: server.tvPassword,
        });
    });

    it('should return an empty array when the client has no servers', async () => {
        // Given
        const { app, getUserServers } = makeSut();
        when(getUserServers.execute).calledWith(expect.anything()).thenResolve([]);

        // When
        const response = await request(app).get('/api/servers');

        // Then
        expect(response.status).toBe(200);
        expect(response.body).toEqual([]);
    });

    it('should pass the clientId as userId to GetUserServers', async () => {
        // Given
        const { app, getUserServers } = makeSut();
        getUserServers.execute.mockResolvedValue([]);

        // When
        await request(app).get('/api/servers');

        // Then
        expect(getUserServers.execute).toHaveBeenCalledWith({ userId: TEST_CLIENT_ID });
    });
});
