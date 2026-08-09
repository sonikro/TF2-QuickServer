import request from 'supertest';
import { describe, it, expect } from 'vitest';
import { when } from 'vitest-when';
import { SourceTvInfo } from '@tf2qs/core';
import { makeSut, injectAuth, TEST_CLIENT_ID } from '../testHelpers';

const SOURCETV_SCOPE = 'read:sourcetv:all';

describe('GET /api/sourcetv-connections', () => {
    it('should return SourceTV info for all ready servers when the client has the required scope', async () => {
        // Given
        const { app, getSourceTvInfo } = makeSut(injectAuth(TEST_CLIENT_ID, SOURCETV_SCOPE));
        const sourceTvInfo: SourceTvInfo[] = [
            {
                serverId: 'server-abc',
                hostIp: '1.2.3.4',
                hostPort: 27015,
                tvIp: '1.2.3.4',
                tvPort: 27020,
                tvPassword: 'tv123',
            },
        ];
        when(getSourceTvInfo.execute).calledWith().thenResolve(sourceTvInfo);

        // When
        const response = await request(app).get('/api/sourcetv-connections');

        // Then
        expect(response.status).toBe(200);
        expect(response.body).toEqual(sourceTvInfo);
        expect(getSourceTvInfo.execute).toHaveBeenCalledWith();
    });

    it('should return an empty array when there are no ready servers', async () => {
        // Given
        const { app, getSourceTvInfo } = makeSut(injectAuth(TEST_CLIENT_ID, SOURCETV_SCOPE));
        when(getSourceTvInfo.execute).calledWith().thenResolve([]);

        // When
        const response = await request(app).get('/api/sourcetv-connections');

        // Then
        expect(response.status).toBe(200);
        expect(response.body).toEqual([]);
    });

    it('should return 403 when the client does not have the required scope', async () => {
        // Given
        const { app, getSourceTvInfo } = makeSut(injectAuth(TEST_CLIENT_ID, 'manage:servers'));

        // When
        const response = await request(app).get('/api/sourcetv-connections');

        // Then
        expect(response.status).toBe(403);
        expect(response.body).toMatchObject({
            error: 'Forbidden',
            message: expect.stringContaining(SOURCETV_SCOPE),
        });
        expect(getSourceTvInfo.execute).not.toHaveBeenCalled();
    });

    it('should return 403 when the token has no scope claim', async () => {
        // Given
        const { app, getSourceTvInfo } = makeSut(injectAuth(TEST_CLIENT_ID));

        // When
        const response = await request(app).get('/api/sourcetv-connections');

        // Then
        expect(response.status).toBe(403);
        expect(getSourceTvInfo.execute).not.toHaveBeenCalled();
    });

    it('should not expose rcon or host passwords', async () => {
        // Given
        const { app, getSourceTvInfo } = makeSut(injectAuth(TEST_CLIENT_ID, SOURCETV_SCOPE));
        when(getSourceTvInfo.execute)
            .calledWith()
            .thenResolve([{ serverId: 'server-abc', hostIp: '1.2.3.4', hostPort: 27015, tvIp: '1.2.3.4', tvPort: 27020, tvPassword: 'tv123' }]);

        // When
        const response = await request(app).get('/api/sourcetv-connections');

        // Then
        expect(response.status).toBe(200);
        expect(response.body[0]).not.toHaveProperty('rconPassword');
        expect(response.body[0]).not.toHaveProperty('hostPassword');
    });
});