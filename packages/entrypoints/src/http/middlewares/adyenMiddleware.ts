import { logger } from '@tf2qs/telemetry';
import { Client as DiscordClient } from 'discord.js';
import { Express, Request, Response } from 'express';
import { EventLogger } from '@tf2qs/core';
import { HandleOrderPaid } from '@tf2qs/core';
import { AdyenPaymentService } from '@tf2qs/providers';
import { NotificationRequestItem } from '@adyen/api-library/lib/src/typings/notification/notificationRequestItem';

export interface AdyenAuthorizationWebhookRequest {
    live:              string;
    notificationItems: NotificationItem[];
}

export interface NotificationItem {
    NotificationRequestItem: NotificationRequestItem;
}

export function registerAdyenMiddleware(args: {
    app: Express,
    handleOrderPaid: HandleOrderPaid,
    discordClient: DiscordClient,
    eventLogger: EventLogger,
    adyenPaymentService: AdyenPaymentService
}) {
    const { app, handleOrderPaid, discordClient, eventLogger, adyenPaymentService } = args;
    logger.emit({ severityText: 'INFO', body: '🔔 Registering Adyen Webhook Middleware' });
    app.post('/adyen-webhook', async (req: Request, res: Response) => {
        const event = req.body as AdyenAuthorizationWebhookRequest

        const notificationItem = event.notificationItems?.[0];
        if (!notificationItem || !notificationItem.NotificationRequestItem) {
            logger.emit({ severityText: 'ERROR', body: '❌ Invalid Adyen Webhook Event: Missing NotificationRequestItem' });
            res.status(400).send('Invalid Webhook Event');
            return;
        }

        // Validate the Adyen webhook event using HMAC signature
        const isValid = adyenPaymentService.validateWebhookSignature({
            notificationRequestItem: notificationItem.NotificationRequestItem,
        })

        if (!isValid) {
            logger.emit({ severityText: 'ERROR', body: '❌ Invalid Adyen Webhook Event' });
            res.status(400).send('Invalid Webhook Event');
            return;
        }

        logger.emit({ severityText: 'INFO', body: `🔔 Webhook Event: ${JSON.stringify(event)}` });

        if (notificationItem.NotificationRequestItem.eventCode === NotificationRequestItem.EventCodeEnum.Authorisation) {

            if (notificationItem.NotificationRequestItem.success !== NotificationRequestItem.SuccessEnum.True) {
                await eventLogger.log({
                    actorId: 'adyen-webhook',
                    eventMessage: `Payment failed for order ${notificationItem.NotificationRequestItem.pspReference}`
                })
                res.status(200).send('Payment failed');
                return;
            }

            const { newCredits, order } = await handleOrderPaid.execute({ orderId: notificationItem.NotificationRequestItem.additionalData!.paymentLinkId });

            // Send a DM to the user
            try {
                const user = await discordClient.users.fetch(order.userId);
                await user.send(`✅ Your payment has been authorised! You now have **${newCredits}** credits.`);
            } catch (err) {
                logger.emit({ severityText: 'ERROR', body: `❌ Failed to send DM to user ${order?.userId}`, attributes: { error: JSON.stringify(err, Object.getOwnPropertyNames(err)) } });
            }
        }

        res.status(200).send('[accepted]');
    });
}