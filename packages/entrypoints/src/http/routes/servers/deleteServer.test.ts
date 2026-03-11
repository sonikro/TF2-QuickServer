import request from 'supertest';
import { describe, it, expect } from 'vitest';
import { when } from 'vitest-when';
import { makeSut, makeServer, TEST_CLIENT_ID } from '../testHelpers';

describe('DELETE /api/servers/:serverId', () => {
    it('should return 202 with a taskId when the client owns the server', async () => {
        // Given
        const { app, backgroundTaskQueue, serverRepository } = makeSut();
        const server = makeServer({ createdBy: TEST_CLIENT_ID });
        when(serverRepository.findById).calledWith('server-xyz').thenResolve(server);
        when(backgroundTaskQueue.enqueue)
            .calledWith('delete-server', expect.objectContaining({ serverId: 'server-xyz' }), undefined, undefined, expect.objectContaining({ ownerId: TEST_CLIENT_ID }))
            .thenResolve('task-delete-123');

        // When
        const response = await request(app).delete('/api/servers/server-xyz');

        // Then
        expect(response.status).toBe(202);
        expect(response.body).toMatchObject({ taskId: 'task-delete-123' });
    });

    it('should return 404 when the server does not exist', async () => {
        // Given
        const { app, serverRepository } = makeSut();
        when(serverRepository.findById).calledWith('nonexistent').thenResolve(null);

        // When
        const response = await request(app).delete('/api/servers/nonexistent');

        // Then
        expect(response.status).toBe(404);
        expect(response.body).toMatchObject({ error: 'Not Found' });
    });

    it('should return 403 when the server belongs to a different client', async () => {
        // Given
        const { app, serverRepository } = makeSut();
        const server = makeServer({ createdBy: 'other-client-xyz' });
        when(serverRepository.findById).calledWith('server-xyz').thenResolve(server);

        // When
        const response = await request(app).delete('/api/servers/server-xyz');

        // Then
        expect(response.status).toBe(403);
        expect(response.body).toMatchObject({ error: 'Forbidden' });
    });
});
