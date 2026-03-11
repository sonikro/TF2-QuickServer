import { Request, Response } from 'express';
import { BackgroundTaskQueue, ServerRepository } from '@tf2qs/core';

export function createDeleteServerHandler(backgroundTaskQueue: BackgroundTaskQueue, serverRepository: ServerRepository) {
    /**
     * @openapi
     * /api/servers/{serverId}:
     *   delete:
     *     summary: Delete a server (async)
     *     description: |
     *       Enqueues a server deletion task and returns a task ID immediately.
     *       Server deletion typically takes 1-3 minutes. Poll `GET /api/tasks/{taskId}` to check status.
     *       Only the client that created the server may delete it.
     *     tags:
     *       - Servers
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: serverId
     *         required: true
     *         schema:
     *           type: string
     *         description: The ID of the server to delete
     *     responses:
     *       202:
     *         description: Server deletion task accepted
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/TaskAccepted'
     *       401:
     *         $ref: '#/components/responses/Unauthorized'
     *       403:
     *         $ref: '#/components/responses/Forbidden'
     *       404:
     *         $ref: '#/components/responses/NotFound'
     */
    return async (req: Request, res: Response): Promise<void> => {
        const clientId = req.auth?.payload.azp || req.auth?.payload.sub;
        if (!clientId) {
            res.status(401).json({ error: 'Unauthorized', message: 'No client ID found in token' });
            return;
        }

        const { serverId } = req.params;

        const server = await serverRepository.findById(serverId);
        if (!server) {
            res.status(404).json({ error: 'Not Found', message: `Server ${serverId} not found` });
            return;
        }

        if (server.createdBy !== clientId) {
            res.status(403).json({ error: 'Forbidden', message: 'You do not have permission to delete this server' });
            return;
        }

        const taskId = await backgroundTaskQueue.enqueue('delete-server', { serverId }, undefined, undefined, { ownerId: clientId as string });

        res.status(202).json({ taskId });
    };
}
