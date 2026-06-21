import { Request, Response } from 'express';
import { GetUserServers } from '@tf2qs/core';
import { logger } from '@tf2qs/telemetry';

export function createListServersHandler(getUserServers: GetUserServers) {
    /**
     * @openapi
     * /api/servers:
     *   get:
     *     summary: List all servers for the authenticated client
     *     description: Returns all TF2 game servers associated with the authenticated API client.
     *     tags:
     *       - Servers
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: A list of servers
     *         content:
     *           application/json:
     *             schema:
     *               type: array
     *               items:
     *                 $ref: '#/components/schemas/Server'
     *       401:
     *         $ref: '#/components/responses/Unauthorized'
     */
    return async (req: Request, res: Response): Promise<void> => {
        const clientId = req.auth?.payload.azp || req.auth?.payload.sub;
        if (!clientId) {
            logger.emit({
                severityText: 'WARN',
                body: 'List servers request with no client ID in token',
                attributes: { path: req.path, method: req.method },
            });
            res.status(401).json({ error: 'Unauthorized', message: 'No client ID found in token' });
            return;
        }

        logger.emit({
            severityText: 'INFO',
            body: 'List servers request received',
            attributes: { clientId: clientId as string },
        });

        const servers = await getUserServers.execute({ userId: clientId as string });

        logger.emit({
            severityText: 'INFO',
            body: 'List servers response',
            attributes: { clientId: clientId as string, serverCount: servers.length },
        });

        res.json(servers);
    };
}
