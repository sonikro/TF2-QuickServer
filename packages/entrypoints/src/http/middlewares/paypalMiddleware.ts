import { Express, Request, Response } from 'express';
import { PayPalOrderApprovedWebhookPayload } from './PayPalOrderApprovedWebhookPayload';
import { HandleOrderPaid } from '@tf2qs/core/src/usecase/HandleOrderPaid';
import { PaypalPaymentService } from '@tf2qs/providers/src/services/PaypalPaymentService';
import { Client as DiscordClient } from 'discord.js';
import { logger } from '@tf2qs/telemetry/src/otel';

export function registerPaypalMiddleware(args: {
    app: Express,
    handleOrderPaid: HandleOrderPaid,
    paypalService: PaypalPaymentService
    discordClient: DiscordClient
}) {
    const { app, handleOrderPaid, paypalService, discordClient } = args;
    logger.emit({ severityText: 'INFO', body: '🔔 Registering PayPal Webhook Middleware' });
    app.post('/paypal-webhook', async (req: Request, res: Response) => {
        const event = req.body;

        // Validate the Paypal webhook event
        const isValid = await paypalService.validateWebhookSignature({
            body: (req as any).rawBody,
            headers: req.headers,
            signatureVerification: {
                transmissionId: req.headers['paypal-transmission-id'] as string,
                transmissionTime: req.headers['paypal-transmission-time'] as string,
                transmissionSig: req.headers['paypal-transmission-sig'] as string,
                certUrl: req.headers['paypal-cert-url'] as string,
                authAlgo: req.headers['paypal-auth-algo'] as string,
                webhookId: process.env.PAYPAL_WEBHOOK_ID!,

            }
        });
        if (!isValid) {
            logger.emit({ severityText: 'ERROR', body: '❌ Invalid PayPal Webhook Event' });
            res.status(400).send('Invalid Webhook Event');
            return;
        }

        logger.emit({ severityText: 'INFO', body: `🔔 Webhook Event: ${JSON.stringify(event)}` });

        if (event.event_type === 'CHECKOUT.ORDER.APPROVED') {
            const payload = event as PayPalOrderApprovedWebhookPayload;
            logger.emit({ severityText: 'INFO', body: `🔔 Order Approved: ${payload.resource.id}` });
            const { newCredits, order } = await handleOrderPaid.execute({ orderId: payload.resource.id });
            // Send a DM to the user
            try {
                const user = await discordClient.users.fetch(order.userId);
                await user.send(`✅ Your order has been paid! You now have **${newCredits}** credits.`);
            } catch (err) {
                logger.emit({ severityText: 'ERROR', body: `❌ Failed to send DM to user ${order?.userId}`, attributes: { error: JSON.stringify(err, Object.getOwnPropertyNames(err)) } });
            }
        }

        res.status(200).send('OK');
    });
}