import { Request, Response } from 'express';
import { GetSourceTvInfo } from '@tf2qs/core';
import { logger } from '@tf2qs/telemetry';

export function createGetSourceTvInfoHandler(getSourceTvInfo: GetSourceTvInfo) {
    /**
     * @openapi
     * /api/sourcetv-connections:
     *   get:
     *     summary: List SourceTV information for all servers
     *     description: |
     *       Returns SourceTV connection information for all ready TF2 game servers across QuickServer.
     *       Requires the `read:sourcetv:all` scope. RCON and server join passwords are never exposed.
     *     tags:
     *       - SourceTV
     *     security:
     *       - bearerAuth: []
     *       - oauth2: [read:sourcetv:all]
     *     responses:
     *       200:
     *         description: A list of SourceTV information for all ready servers
     *         content:
     *           application/json:
     *             schema:
     *               type: array
     *               items:
     *                 $ref: '#/components/schemas/SourceTvInfo'
     *       401:
     *         $ref: '#/components/responses/Unauthorized'
     *       403:
     *         $ref: '#/components/responses/Forbidden'
     */
    return async (req: Request, res: Response): Promise<void> => {
        const clientId = req.auth?.payload.azp || req.auth?.payload.sub;
        if (!clientId) {
            logger.emit({
                severityText: 'WARN',
                body: 'SourceTV info request with no client ID in token',
                attributes: { path: req.path, method: req.method },
            });
            res.status(401).json({ error: 'Unauthorized', message: 'No client ID found in token' });
            return;
        }

        logger.emit({
            severityText: 'INFO',
            body: 'SourceTV info request received',
            attributes: { clientId: clientId as string },
        });

        const sourceTvInfo = await getSourceTvInfo.execute();

        logger.emit({
            severityText: 'INFO',
            body: 'SourceTV info response',
            attributes: { clientId: clientId as string, serverCount: sourceTvInfo.length },
        });

        res.json(sourceTvInfo);
    };
}