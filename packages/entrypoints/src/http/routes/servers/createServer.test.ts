import request from 'supertest';
import { describe, it, expect } from 'vitest';
import { when } from 'vitest-when';
import { makeSut, TEST_CLIENT_ID } from '../testHelpers';

describe('POST /api/servers', () => {
    it('should return 202 with a taskId when request is valid', async () => {
        // Given
        const { app, backgroundTaskQueue } = makeSut();
        when(backgroundTaskQueue.enqueue)
            .calledWith('create-server-for-client', expect.anything(), undefined, undefined, expect.objectContaining({ ownerId: TEST_CLIENT_ID }))
            .thenResolve('task-123');

        // When
        const response = await request(app)
            .post('/api/servers')
            .send({ region: 'sa-saopaulo-1', variantName: 'standard-competitive' });

        // Then
        expect(response.status).toBe(202);
        expect(response.body).toMatchObject({ taskId: 'task-123' });
    });

    it('should enqueue the task with clientId and correct data', async () => {
        // Given
        const { app, backgroundTaskQueue } = makeSut();
        backgroundTaskQueue.enqueue.mockResolvedValue('task-123');
        const extraEnvs = { STV_TITLE: 'My Server' };
        const firstMap = 'cp_process_f12';

        // When
        await request(app)
            .post('/api/servers')
            .send({ region: 'eu-frankfurt-1', variantName: 'standard-competitive', extraEnvs, firstMap });

        // Then
        expect(backgroundTaskQueue.enqueue).toHaveBeenCalledWith(
            'create-server-for-client',
            expect.objectContaining({
                region: 'eu-frankfurt-1',
                variantName: 'standard-competitive',
                clientId: TEST_CLIENT_ID,
                extraEnvs,
                firstMap,
            }),
            undefined,
            undefined,
            expect.objectContaining({ ownerId: TEST_CLIENT_ID })
        );
    });

    it('should use empty extraEnvs when not provided', async () => {
        // Given
        const { app, backgroundTaskQueue } = makeSut();
        backgroundTaskQueue.enqueue.mockResolvedValue('task-123');

        // When
        await request(app)
            .post('/api/servers')
            .send({ region: 'sa-saopaulo-1', variantName: 'standard-competitive' });

        // Then
        expect(backgroundTaskQueue.enqueue).toHaveBeenCalledWith(
            'create-server-for-client',
            expect.objectContaining({ extraEnvs: undefined }),
            undefined,
            undefined,
            expect.objectContaining({ ownerId: TEST_CLIENT_ID })
        );
    });

    it.each([
        { body: { variantName: 'standard-competitive' }, description: 'missing region' },
        { body: { region: 'us-east-1' }, description: 'missing variantName' },
        { body: { region: 123, variantName: 'standard-competitive' }, description: 'region is not a string' },
        { body: { region: 'us-east-1', variantName: 456 }, description: 'variantName is not a string' },
        { body: { region: 'us-east-1', variantName: 'standard-competitive', extraEnvs: ['invalid'] }, description: 'extraEnvs is an array' },
        { body: { region: 'invalid-region', variantName: 'standard-competitive' }, description: 'region is not a valid Region enum value' },
        { body: { region: 'us-east-1', variantName: 'standard-competitive', extraEnvs: { KEY: 123 } }, description: 'extraEnvs has non-string values' },
        { body: { region: 'us-east-1', variantName: 'standard-competitive', firstMap: 123 }, description: 'firstMap is not a string' },
        { body: { region: 'us-east-1', variantName: 'standard-competitive', firstMap: '   ' }, description: 'firstMap is an empty string' },
        { body: { region: 'us-east-1', variantName: 'standard-competitive', firstMap: ';kill;' }, description: 'firstMap is a malicious injection string' },
    ])('should return 400 when $description', async ({ body }) => {
        // Given
        const { app } = makeSut();

        // When
        const response = await request(app).post('/api/servers').send(body);

        // Then
        expect(response.status).toBe(400);
        expect(response.body).toMatchObject({ error: 'Bad Request' });
    });
});
