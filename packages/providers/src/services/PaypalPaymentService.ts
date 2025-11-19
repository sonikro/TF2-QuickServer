import { CreditOrder } from "@tf2qs/core/src/domain/CreditOrder";
import { CreditOrderRequest } from "@tf2qs/core/src/domain/CreditOrderRequest";
import { PaymentService } from "@tf2qs/core/src/services/PaymentService";
import { PaypalCreateOrderResponse } from "./PaypalPaymentServiceTypes";

export class PaypalPaymentService implements PaymentService {

    private readonly baseUrl: string;
    constructor(private readonly dependencies: {
        clientId: string;
        clientSecret: string;
        sandbox: boolean;
    }) {
        this.baseUrl = dependencies.sandbox === false ? 'https://api.paypal.com' : 'https://api.sandbox.paypal.com'
    }

    async createCreditsOrder(request: CreditOrderRequest): Promise<CreditOrder> {
        const { amount, currency, userId } = request;
        const accessToken = await this.generateToken();
        const orderData = {
            intent: 'CAPTURE',
            purchase_units: [
                {
                    amount: {
                        currency_code: currency,
                        value: amount,
                    },
                },
            ],
            application_context: {
                brand_name: 'TF2-QuickServer',
                landing_page: 'LOGIN',
                user_action: 'PAY_NOW',
            },
        };

        const res = await fetch(`${this.baseUrl}/v2/checkout/orders`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(orderData),
        });

        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`Failed to create PayPal order: ${errorText}`);
        }

        const data: PaypalCreateOrderResponse = await res.json();
        const approvalLink = data.links.find((link) => link.rel === 'approve')?.href;

        if (!approvalLink) {
            throw new Error('No approval link found in PayPal response.');
        }

        return {
            id: data.id,
            amount,
            currency,
            userId,
            createdAt: new Date(),
            updatedAt: new Date(),
            status: 'pending',
            link: approvalLink,
        }
    }

    public async validateWebhookSignature(args: {
        headers: { [key: string]: string | string [] | undefined };
        body: string;
        signatureVerification: {
            webhookId: string;
            transmissionId: string;
            transmissionTime: string;
            certUrl: string;
            authAlgo: string;
            transmissionSig: string;
        };
    }): Promise<boolean> {
        const { webhookId, transmissionId, transmissionTime, certUrl, authAlgo, transmissionSig } = args.signatureVerification;

        const res = await fetch(`${this.baseUrl}/v1/notifications/verify-webhook-signature`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${await this.generateToken()}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                webhook_id: webhookId,
                transmission_id: transmissionId,
                transmission_time: transmissionTime,
                cert_url: certUrl,
                auth_algo: authAlgo,
                transmission_sig: transmissionSig,
                webhook_event: JSON.parse(args.body),
            }),
        });

        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`Failed to validate webhook signature: ${errorText}`);
        }

        const data = await res.json();
        return data.verification_status === 'SUCCESS';
    }

    private async generateToken(): Promise<string> {
        const { clientId, clientSecret } = this.dependencies;
        const credentials = `${clientId}:${clientSecret}`;
        const encodedCredentials = Buffer.from(credentials).toString('base64');

        const res = await fetch(`${this.baseUrl}/v1/oauth2/token`, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${encodedCredentials}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: 'grant_type=client_credentials',
        });

        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`Failed to get access token: ${errorText}`);
        }

        const data = await res.json();
        return data.access_token;
    }

}