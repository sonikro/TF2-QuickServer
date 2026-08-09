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

    it('should include the SourceTV endpoint and schema in the spec', async () => {
        // Given
        const { app } = makeSut();

        // When
        const response = await request(app).get('/api/openapi.json');

        // Then
        expect(response.body.paths['/api/sourcetv-connections']).toBeDefined();
        expect(response.body.components.schemas.SourceTvInfo).toBeDefined();
    });

    it('should declare the two API scopes in the oauth2 security scheme', async () => {
        // Given
        const { app } = makeSut();

        // When
        const response = await request(app).get('/api/openapi.json');

        // Then
        const scopes = response.body.components.securitySchemes.oauth2.flows.clientCredentials.scopes;
        expect(scopes).toMatchObject({
            'manage:servers': expect.any(String),
            'read:sourcetv:all': expect.any(String),
        });
    });

    it('should require the correct scope on each endpoint', async () => {
        // Given
        const { app } = makeSut();

        // When
        const response = await request(app).get('/api/openapi.json');

        // Then
        const paths = response.body.paths;
        const serverSecurity = paths['/api/servers'].get.security;
        const sourcetvSecurity = paths['/api/sourcetv-connections'].get.security;
        expect(serverSecurity).toEqual(
            expect.arrayContaining([expect.objectContaining({ oauth2: ['manage:servers'] })])
        );
        expect(sourcetvSecurity).toEqual(
            expect.arrayContaining([expect.objectContaining({ oauth2: ['read:sourcetv:all'] })])
        );
    });
});
