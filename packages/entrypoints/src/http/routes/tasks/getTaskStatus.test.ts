import request from 'supertest';
import { describe, it, expect } from 'vitest';
import { when } from 'vitest-when';
import { TaskStatus } from '@tf2qs/core';
import { makeSut, makeServer, TEST_CLIENT_ID } from '../testHelpers';

describe('GET /api/tasks/:taskId', () => {
    it('should return the task status for a known taskId owned by the requester', async () => {
        // Given
        const { app, backgroundTaskQueue } = makeSut();
        const taskStatus: TaskStatus = {
            taskId: 'task-123',
            type: 'create-server-for-client',
            status: 'completed',
            ownerId: TEST_CLIENT_ID,
            result: makeServer(),
            createdAt: new Date('2026-01-01T00:00:00Z'),
            completedAt: new Date('2026-01-01T00:04:30Z'),
        };
        when(backgroundTaskQueue.getTask).calledWith('task-123').thenResolve(taskStatus);

        // When
        const response = await request(app).get('/api/tasks/task-123');

        // Then
        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({
            taskId: 'task-123',
            type: 'create-server-for-client',
            status: 'completed',
        });
    });

    it('should return the task status for a task without an owner (legacy tasks)', async () => {
        // Given
        const { app, backgroundTaskQueue } = makeSut();
        const taskStatus: TaskStatus = {
            taskId: 'task-legacy',
            type: 'create-server-for-client',
            status: 'completed',
            createdAt: new Date('2026-01-01T00:00:00Z'),
        };
        when(backgroundTaskQueue.getTask).calledWith('task-legacy').thenResolve(taskStatus);

        // When
        const response = await request(app).get('/api/tasks/task-legacy');

        // Then
        expect(response.status).toBe(200);
    });

    it('should return 403 when the task belongs to a different client', async () => {
        // Given
        const { app, backgroundTaskQueue } = makeSut();
        const taskStatus: TaskStatus = {
            taskId: 'task-other',
            type: 'create-server-for-client',
            status: 'completed',
            ownerId: 'other-client-xyz',
            createdAt: new Date(),
        };
        when(backgroundTaskQueue.getTask).calledWith('task-other').thenResolve(taskStatus);

        // When
        const response = await request(app).get('/api/tasks/task-other');

        // Then
        expect(response.status).toBe(403);
        expect(response.body).toMatchObject({ error: 'Forbidden' });
    });

    it('should return 404 for an unknown taskId', async () => {
        // Given
        const { app, backgroundTaskQueue } = makeSut();
        when(backgroundTaskQueue.getTask).calledWith('unknown-task').thenResolve(null);

        // When
        const response = await request(app).get('/api/tasks/unknown-task');

        // Then
        expect(response.status).toBe(404);
        expect(response.body).toMatchObject({ error: 'Not Found' });
    });

    it.each([
        { status: 'pending' as const },
        { status: 'running' as const },
        { status: 'completed' as const },
        { status: 'failed' as const },
    ])('should return task in $status state', async ({ status }) => {
        // Given
        const { app, backgroundTaskQueue } = makeSut();
        const taskStatus: TaskStatus = {
            taskId: 'task-456',
            type: 'create-server-for-client',
            status,
            ownerId: TEST_CLIENT_ID,
            createdAt: new Date(),
        };
        when(backgroundTaskQueue.getTask).calledWith('task-456').thenResolve(taskStatus);

        // When
        const response = await request(app).get('/api/tasks/task-456');

        // Then
        expect(response.status).toBe(200);
        expect(response.body.status).toBe(status);
    });
});
