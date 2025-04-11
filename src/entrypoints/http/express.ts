import express, { Express } from 'express';
import { registerPaypalMiddleware } from './middlewares/paypalMiddleware';
import { HandleOrderPaid } from '../../core/usecase/HandleOrderPaid';
import bodyParser from 'body-parser';
import { PaypalPaymentService } from '../../providers/services/PaypalPaymentService';
import { Client as DiscordClient } from 'discord.js';

export function initializeExpress(dependencies: {
    handleOrderPaid: HandleOrderPaid
    paypalService: PaypalPaymentService
    discordClient: DiscordClient
}): Express {
    const { handleOrderPaid, paypalService, discordClient } = dependencies;
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

    if (process.env.NODE_ENV !== 'test') {
        app.listen(PORT, () => {
            console.log(`🚀 TF2-QuickServer listening at http://localhost:${PORT}/`);
        });
    }

    return app;
}