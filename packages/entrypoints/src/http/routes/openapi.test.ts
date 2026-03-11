import request from 'supertest';
import { describe, it, expect } from 'vitest';
import { makeSut } from './testHelpers';

describe('GET /api/docs', () => {
    it('should serve the Swagger UI', async () => {
        // Given
        const { app } = makeSut();

        // When
        const response = await request(app).get('/api/docs/');

        // Then
        expect(response.status).toBe(200);
        expect(response.text).toContain('swagger');
    });
});

describe('GET /api/openapi.json', () => {
    it('should serve the OpenAPI spec as JSON', async () => {
        // Given
        const { app } = makeSut();

        // When
        const response = await request(app).get('/api/openapi.json');

        // Then
        expect(response.status).toBe(200);
        expect(response.body.openapi).toBe('3.0.0');
        expect(response.body.info.title).toBe('TF2 QuickServer API');
    });

    it('should include server and task endpoints in the spec', async () => {
        // Given
        const { app } = makeSut();

        // When
        const response = await request(app).get('/api/openapi.json');

        // Then
        const paths = Object.keys(response.body.paths ?? {});
        expect(paths.some((p) => p.includes('servers'))).toBe(true);
        expect(paths.some((p) => p.includes('tasks'))).toBe(true);
    });
});
