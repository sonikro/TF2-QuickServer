import { Express, Request, Response } from 'express';
import { PayPalOrderApprovedWebhookPayload } from './PayPalOrderApprovedWebhookPayload';
import { HandleOrderPaid } from '../../../core/usecase/HandleOrderPaid';
import { PaypalPaymentService } from '../../../providers/services/PaypalPaymentService';

export function registerPaypalMiddleware(args: {
    app: Express,
    handleOrderPaid: HandleOrderPaid,
    paypalService: PaypalPaymentService
}) {
    const { app, handleOrderPaid, paypalService } = args;
    console.log('🔔 Registering PayPal Webhook Middleware');
    app.post('/paypal-webhook', async (req: Request, res: Response) => {
        const event = req.body;

        // Validate the Paypal webhook event
        const isValid = await paypalService.validateWebhookSignature({
            body: (req as any).rawBody,
            headers: req.headers,
            signatureVerification: {
                transmissionId: req.headers['paypal-transmission-id'] as string,
                transmissionTime: new Date(req.headers['paypal-transmission-time'] as string),
                transmissionSig: req.headers['paypal-transmission-sig'] as string,
                certUrl: req.headers['paypal-cert-url'] as string,
                authAlgo: req.headers['paypal-auth-algo'] as string,
                webhookId: process.env.PAYPAL_WEBHOOK_ID!,

            }
        });
        if (!isValid) {
            console.error('❌ Invalid PayPal Webhook Event');
            res.status(400).send('Invalid Webhook Event');
            return;
        }

        console.log('🔔 Webhook Event:', event);

        if (event.event_type === 'CHECKOUT.ORDER.APPROVED') {
            const payload = event as PayPalOrderApprovedWebhookPayload;
            console.log('🔔 Order Approved:', payload.resource.id);
            await handleOrderPaid.execute({ orderId: payload.resource.id });
        }

        res.status(200).send('OK');
    });
}