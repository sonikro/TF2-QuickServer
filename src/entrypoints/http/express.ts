import { logger } from '../../telemetry/otel';
import express, { Express } from 'express';
import { registerPaypalMiddleware } from './middlewares/paypalMiddleware';
import { HandleOrderPaid } from '../../core/usecase/HandleOrderPaid';
import bodyParser from 'body-parser';
import { PaypalPaymentService } from '../../providers/services/PaypalPaymentService';
import { Client as DiscordClient } from 'discord.js';
import { registerAdyenMiddleware } from './middlewares/adyenMiddleware';
import { EventLogger } from '../../core/services/EventLogger';
import { AdyenPaymentService } from '../../providers/services/AdyenPaymentService';

export function initializeExpress(dependencies: {
    handleOrderPaid: HandleOrderPaid
    paypalService: PaypalPaymentService
    adyenPaymentService: AdyenPaymentService,
    discordClient: DiscordClient
    eventLogger: EventLogger
}): Express {
    const { handleOrderPaid, paypalService, discordClient, eventLogger, adyenPaymentService } = dependencies;
    const app = express();
    const PORT = process.env.HTTP_PORT || 3000;

    app.use(bodyParser.json({
        verify: (req: any, res, buf) => {
            req.rawBody = buf.toString(); // Save raw body for PayPal verification
        }
    }));

    registerPaypalMiddleware({
        app,
        handleOrderPaid,
        paypalService,
        discordClient
    })

    registerAdyenMiddleware({
        app,
        discordClient,
        eventLogger,
        handleOrderPaid,
        adyenPaymentService
    })
    if (process.env.NODE_ENV !== 'test') {
        app.listen(PORT, () => {
            logger.emit({ severityText: 'INFO', body: `🚀 TF2-QuickServer listening at http://localhost:${PORT}/` });
        });
    }

    return app;
}