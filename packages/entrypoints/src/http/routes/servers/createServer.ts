import { Request, Response } from 'express';
import { BackgroundTaskQueue, Region, Variant } from '@tf2qs/core';
import { CreateServerForClientTaskData } from '@tf2qs/providers';

export function createCreateServerHandler(backgroundTaskQueue: BackgroundTaskQueue) {
    /**
     * @openapi
     * /api/servers:
     *   post:
     *     summary: Create a new TF2 server (async)
     *     description: |
     *       Enqueues a server creation task and returns a task ID immediately.
     *       Server creation typically takes 4-6 minutes. Poll `GET /api/tasks/{taskId}` to check status.
     *       When completed, the task result contains the full server details including credentials.
     *     tags:
     *       - Servers
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/CreateServerRequest'
     *     responses:
     *       202:
     *         description: Server creation task accepted
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/TaskAccepted'
     *       400:
     *         $ref: '#/components/responses/BadRequest'
     *       401:
     *         $ref: '#/components/responses/Unauthorized'
     */
    return async (req: Request, res: Response): Promise<void> => {
        const clientId = req.auth?.payload.azp || req.auth?.payload.sub;
        if (!clientId) {
            res.status(401).json({ error: 'Unauthorized', message: 'No client ID found in token' });
            return;
        }

        const { region, variantName, extraEnvs, firstMap } = req.body as {
            region?: unknown;
            variantName?: unknown;
            extraEnvs?: unknown;
            firstMap?: unknown;
        };

        if (!region || typeof region !== 'string') {
            res.status(400).json({ error: 'Bad Request', message: 'region is required and must be a string' });
            return;
        }
        if (!Object.values(Region).includes(region as Region)) {
            res.status(400).json({ error: 'Bad Request', message: 'region is not a valid region' });
            return;
        }
        if (!variantName || typeof variantName !== 'string') {
            res.status(400).json({ error: 'Bad Request', message: 'variantName is required and must be a string' });
            return;
        }
        if (firstMap !== undefined && (typeof firstMap !== 'string' || firstMap.trim().length === 0)) {
            res.status(400).json({ error: 'Bad Request', message: 'firstMap must be a non-empty string if provided' });
            return;
        }

        let sanitizedExtraEnvs: Record<string, string> | undefined;
        if (extraEnvs !== undefined) {
            if (typeof extraEnvs !== 'object' || Array.isArray(extraEnvs) || extraEnvs === null) {
                res.status(400).json({ error: 'Bad Request', message: 'extraEnvs must be a key-value object if provided' });
                return;
            }
            const result: Record<string, string> = {};
            for (const [key, value] of Object.entries(extraEnvs as Record<string, unknown>)) {
                if (typeof value !== 'string') {
                    res.status(400).json({ error: 'Bad Request', message: 'extraEnvs values must be strings' });
                    return;
                }
                result[key] = value;
            }
            sanitizedExtraEnvs = result;
        }

        const taskData: CreateServerForClientTaskData = {
            region: region as Region,
            variantName: variantName as Variant,
            clientId: clientId as string,
            extraEnvs: sanitizedExtraEnvs,
            firstMap: firstMap as string | undefined,
        };

        const taskId = await backgroundTaskQueue.enqueue('create-server-for-client', taskData, undefined, undefined, { ownerId: clientId as string });

        res.status(202).json({ taskId });
    };
}
