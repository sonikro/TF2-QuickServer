import swaggerJsdoc from 'swagger-jsdoc';
import path from 'path';

export const swaggerOptions: swaggerJsdoc.Options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'TF2 QuickServer API',
            version: '1.0.0',
            description: 'API for managing TF2 game servers. Designed for integration with the tf2pickup system.',
        },
        servers: [
            { url: 'https://tf2-quickserver.sonikro.com/api', description: 'Production' },
            { url: '/api', description: 'Local / relative' },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: 'Auth0 M2M JWT token (Client Credentials flow). Use the `azp` claim as the client identifier.',
                },
                oauth2: {
                    type: 'oauth2',
                    description: 'Auth0 OAuth2 Client Credentials flow for M2M authentication.',
                    flows: {
                        clientCredentials: {
                            tokenUrl: 'https://tf2-quickserver.us.auth0.com/oauth/token',
                            scopes: {},
                        },
                    },
                },
            },
            schemas: {
                Server: {
                    type: 'object',
                    properties: {
                        serverId: { type: 'string', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' },
                        region: { type: 'string', example: 'us-east-1' },
                        variant: { type: 'string', example: 'standard-competitive' },
                        hostIp: { type: 'string', example: '1.2.3.4' },
                        hostPort: { type: 'integer', example: 27015 },
                        tvIp: { type: 'string', example: '1.2.3.4' },
                        tvPort: { type: 'integer', example: 27020 },
                        rconPassword: { type: 'string', example: 'rconpass123' },
                        hostPassword: { type: 'string', example: 'serverpass123' },
                        tvPassword: { type: 'string', example: 'tvpass123' },
                        rconAddress: { type: 'string', example: '1.2.3.4:27015' },
                        createdAt: { type: 'string', format: 'date-time' },
                        createdBy: { type: 'string', description: 'Client ID of the creator' },
                        status: { type: 'string', enum: ['pending', 'ready', 'terminating'] },
                    },
                },
                CreateServerRequest: {
                    type: 'object',
                    required: ['region', 'variantName'],
                    properties: {
                        region: { type: 'string', example: 'us-east-1', description: 'The AWS or OCI region to deploy in' },
                        variantName: { type: 'string', example: 'standard-competitive', description: 'The server variant to deploy' },
                        extraEnvs: {
                            type: 'object',
                            additionalProperties: { type: 'string' },
                            example: { TF2PICKUPORG_API_ADDRESS: 'API Address', TF2PICKUPORG_SECRET: 'API Secret' },
                            description: 'Optional custom environment variables to pass to the server',
                        },
                    },
                },
                TaskAccepted: {
                    type: 'object',
                    properties: {
                        taskId: { type: 'string', example: 'task-1700000000000-abc123' },
                    },
                },
                TaskStatus: {
                    type: 'object',
                    properties: {
                        taskId: { type: 'string', example: 'task-1700000000000-abc123' },
                        type: { type: 'string', example: 'create-server-for-client' },
                        status: { type: 'string', enum: ['pending', 'running', 'completed', 'failed'] },
                        result: {
                            nullable: true,
                            description: 'The result when status is completed. Contains a Server object for create-server tasks, or null for delete-server tasks.',
                            oneOf: [
                                { $ref: '#/components/schemas/Server' },
                                { type: 'object', nullable: true },
                            ],
                        },
                        error: { type: 'string', description: 'Error message when status is failed' },
                        createdAt: { type: 'string', format: 'date-time' },
                        completedAt: { type: 'string', format: 'date-time' },
                    },
                },
                Error: {
                    type: 'object',
                    properties: {
                        error: { type: 'string' },
                        message: { type: 'string' },
                    },
                },
            },
            responses: {
                Unauthorized: {
                    description: 'Missing or invalid JWT token',
                    content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
                },
                Forbidden: {
                    description: 'Authenticated client does not own this resource',
                    content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
                },
                NotFound: {
                    description: 'Resource not found',
                    content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
                },
                BadRequest: {
                    description: 'Invalid request body or parameters',
                    content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
                },
            },
        },
        security: [{ bearerAuth: [] }, { oauth2: [] }],
        'x-auth0': {
            domain: 'tf2-quickserver.us.auth0.com',
            audience: 'https://tf2-quickserver.sonikro.com',
        },
    },
    apis: [
        path.join(__dirname, '../routes/servers/*.ts'),
        path.join(__dirname, '../routes/servers/*.js'),
        path.join(__dirname, '../routes/tasks/*.ts'),
        path.join(__dirname, '../routes/tasks/*.js'),
    ],
};
