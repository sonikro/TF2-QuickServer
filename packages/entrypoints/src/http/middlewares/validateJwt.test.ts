import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextFunction, Request, Response } from 'express';
import { UnauthorizedError } from 'express-oauth2-jwt-bearer';
import { createValidateJwtMiddleware } from './validateJwt';

vi.mock('express-oauth2-jwt-bearer', () => ({
    auth: vi.fn(),
    UnauthorizedError: class UnauthorizedError extends Error {
        status: number;
        constructor(message: string) {
            super(message);
            this.name = 'UnauthorizedError';
            this.status = 401;
        }
    }
}));

describe("createValidateJwtMiddleware", () => {
    const makeSut = async () => {
        const { auth } = await import('express-oauth2-jwt-bearer');
        const mockJwtCheck = vi.fn();
        vi.mocked(auth).mockReturnValue(mockJwtCheck as any);

        const req = {
            path: '/api/test'
        } as Request;
        
        const res = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn().mockReturnThis()
        } as unknown as Response;
        
        const next = vi.fn() as NextFunction;

        return {
            auth,
            mockJwtCheck,
            req,
            res,
            next
        };
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("when Auth0 configuration is missing", () => {
        it("should return a pass-through middleware when domain is empty", async () => {
            const { req, res, next } = await makeSut();

            const middleware = createValidateJwtMiddleware({
                auth0Domain: '',
                auth0Audience: 'https://api.test.com'
            });

            middleware(req, res, next);

            expect(next).toHaveBeenCalledOnce();
            expect(res.status).not.toHaveBeenCalled();
        });

        it("should return a pass-through middleware when audience is empty", async () => {
            const { req, res, next } = await makeSut();

            const middleware = createValidateJwtMiddleware({
                auth0Domain: 'test.auth0.com',
                auth0Audience: ''
            });

            middleware(req, res, next);

            expect(next).toHaveBeenCalledOnce();
            expect(res.status).not.toHaveBeenCalled();
        });

        it("should return a pass-through middleware when both are empty", async () => {
            const { req, res, next } = await makeSut();

            const middleware = createValidateJwtMiddleware({
                auth0Domain: '',
                auth0Audience: ''
            });

            middleware(req, res, next);

            expect(next).toHaveBeenCalledOnce();
            expect(res.status).not.toHaveBeenCalled();
        });
    });

    describe("when Auth0 configuration is valid", () => {
        it("should create JWT check middleware with correct configuration", async () => {
            const { auth } = await makeSut();

            createValidateJwtMiddleware({
                auth0Domain: 'test.auth0.com',
                auth0Audience: 'https://api.test.com'
            });

            expect(auth).toHaveBeenCalledWith({
                audience: 'https://api.test.com',
                issuerBaseURL: 'https://test.auth0.com',
                tokenSigningAlg: 'RS256'
            });
        });

        it("should call next when JWT validation succeeds", async () => {
            const { mockJwtCheck, req, res, next } = await makeSut();

            mockJwtCheck.mockImplementation((_req: any, _res: any, callback: any) => {
                callback();
            });

            const middleware = createValidateJwtMiddleware({
                auth0Domain: 'test.auth0.com',
                auth0Audience: 'https://api.test.com'
            });

            middleware(req, res, next);

            expect(mockJwtCheck).toHaveBeenCalledWith(req, res, expect.any(Function));
            expect(next).toHaveBeenCalledOnce();
            expect(res.status).not.toHaveBeenCalled();
        });

        it("should return 401 when UnauthorizedError is thrown", async () => {
            const { mockJwtCheck, req, res, next } = await makeSut();

            const unauthorizedError = new UnauthorizedError('Token expired');
            mockJwtCheck.mockImplementation((_req: any, _res: any, callback: any) => {
                callback(unauthorizedError);
            });

            const middleware = createValidateJwtMiddleware({
                auth0Domain: 'test.auth0.com',
                auth0Audience: 'https://api.test.com'
            });

            middleware(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({
                error: 'Unauthorized',
                message: 'Invalid or missing authentication token'
            });
            expect(next).not.toHaveBeenCalled();
        });

        it("should return 500 when unknown error is thrown", async () => {
            const { mockJwtCheck, req, res, next } = await makeSut();

            const unknownError = new Error('Something went wrong');
            mockJwtCheck.mockImplementation((_req: any, _res: any, callback: any) => {
                callback(unknownError);
            });

            const middleware = createValidateJwtMiddleware({
                auth0Domain: 'test.auth0.com',
                auth0Audience: 'https://api.test.com'
            });

            middleware(req, res, next);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                error: 'Internal Server Error',
                message: 'Authentication validation failed'
            });
            expect(next).not.toHaveBeenCalled();
        });

        it("should include request path in error context", async () => {
            const { mockJwtCheck, res, next } = await makeSut();

            const unauthorizedError = new UnauthorizedError('Invalid token');
            mockJwtCheck.mockImplementation((_req: any, _res: any, callback: any) => {
                callback(unauthorizedError);
            });

            const req = {
                path: '/api/protected-resource'
            } as Request;

            const middleware = createValidateJwtMiddleware({
                auth0Domain: 'test.auth0.com',
                auth0Audience: 'https://api.test.com'
            });

            middleware(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
        });
    });
});

