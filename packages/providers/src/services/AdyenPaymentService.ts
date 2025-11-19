import { hmacValidator } from "@adyen/api-library";
import { CreditOrder } from "@tf2qs/core";
import { CreditOrderRequest } from "@tf2qs/core";
import { PaymentService } from "@tf2qs/core";
import { NotificationRequestItem } from "@adyen/api-library/lib/src/typings/notification/notificationRequestItem";
import { PaymentLinkRequest } from "@adyen/api-library/lib/src/typings/checkout/paymentLinkRequest"
import { PaymentLinkResponse } from "@adyen/api-library/lib/src/typings/checkout/paymentLinkResponse";
export class AdyenPaymentService implements PaymentService {
    private readonly baseUrl: string;

    constructor(private readonly dependencies: {
        apiKey: string;
        environment: 'live' | 'test';
        merchantAccount: string;
        hmacKey: string;
    }) {
        this.baseUrl = dependencies.environment === 'live'
            ? 'https://checkout-live.adyen.com/v71'
            : 'https://checkout-test.adyen.com/v71';
    }

    async createCreditsOrder(request: CreditOrderRequest): Promise<CreditOrder> {
        const { amount, currency, userId } = request;

        const paymentLinkRequest: PaymentLinkRequest = {
            amount: {
                currency,
                value: Math.round(amount * 100), // Convert to minor units
            },
            reference: `TF2-Quick-Server-${userId}-${Date.now()}`,
            merchantAccount: this.dependencies.merchantAccount,
            // allowedPaymentMethods: ["pix", "boleto", "mc", "visa"]
        };

        const response = await fetch(`${this.baseUrl}/paymentLinks`, {
            method: 'POST',
            headers: {
                'X-API-Key': this.dependencies.apiKey,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(paymentLinkRequest),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to create Adyen payment link: ${errorText}`);
        }

        const data = await response.json() as PaymentLinkResponse;

        return {
            id: data.id,
            amount,
            currency,
            userId,
            createdAt: new Date(),
            updatedAt: new Date(),
            status: 'pending',
            link: data.url, // Payment link URL
        };
    }

    validateWebhookSignature(args: {
        notificationRequestItem: NotificationRequestItem
    }): boolean {
        const hmac = new hmacValidator()

        return hmac.validateHMAC(
            args.notificationRequestItem,
            this.dependencies.hmacKey,
        );
    }
}