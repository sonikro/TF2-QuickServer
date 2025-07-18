import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { initializeExpress } from './express';

describe("initializeExpress", () => {

    let app: ReturnType<typeof initializeExpress>;

    beforeEach(() => {
        vi.clearAllMocks();
        app = initializeExpress({});
    });

    it("should return 404 for unknown routes", async () => {
        const response = await request(app).get("/non-existent");
        expect(response.status).toBe(404);
    });

    describe("GET /healthz", () => {
        it("should return 200 OK for health check", async () => {
            const response = await request(app).get("/healthz");
            expect(response.status).toBe(200);
            expect(response.text).toBe("ok");
        });
    });

});
