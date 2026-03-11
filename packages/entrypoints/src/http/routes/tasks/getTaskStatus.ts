import { Request, Response } from 'express';
import { BackgroundTaskQueue } from '@tf2qs/core';

export function createGetTaskStatusHandler(backgroundTaskQueue: BackgroundTaskQueue) {
    /**
     * @openapi
     * /api/tasks/{taskId}:
     *   get:
     *     summary: Get the status of an async task
     *     description: |
     *       Poll this endpoint to check the status of a previously submitted async task
     *       (e.g. server creation or deletion). When `status` is `completed`, the `result`
     *       field contains the full server object. When `status` is `failed`, the `error`
     *       field contains the failure reason.
     *     tags:
     *       - Tasks
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: taskId
     *         required: true
     *         schema:
     *           type: string
     *         description: The task ID returned by a create/delete server request
     *     responses:
     *       200:
     *         description: Task status
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/TaskStatus'
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

        const { taskId } = req.params;

        const taskStatus = await backgroundTaskQueue.getTask(taskId);
        if (!taskStatus) {
            res.status(404).json({ error: 'Not Found', message: `Task ${taskId} not found` });
            return;
        }

        if (taskStatus.ownerId && taskStatus.ownerId !== clientId) {
            res.status(403).json({ error: 'Forbidden', message: 'You do not have permission to view this task' });
            return;
        }

        res.json(taskStatus);
    };
}
