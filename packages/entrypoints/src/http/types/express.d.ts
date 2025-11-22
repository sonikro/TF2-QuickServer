import { Request } from 'express';

declare global {
    namespace Express {
        interface Request {
            auth?: {
                payload: {
                    iss?: string;
                    sub?: string;
                    aud?: string[] | string;
                    iat?: number;
                    exp?: number;
                    azp?: string;
                    scope?: string;
                    permissions?: string[];
                    [key: string]: unknown;
                };
            };
        }
    }
}

export {};
