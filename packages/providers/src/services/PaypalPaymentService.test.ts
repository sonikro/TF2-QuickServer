import { http as rest } from "msw";
import { setupServer } from "msw/node";
import { beforeAll, afterAll, afterEach, expect, describe, it } from "vitest";
import { CreditOrderRequest } from "@tf2qs/core";
import { PaypalPaymentService } from "./PaypalPaymentService";
import Chance from "chance";

const chance = new Chance();

export function createTestEnvironment(baseUrl: string) {
    const server = setupServer();

    beforeAll(() => server.listen());
    afterEach(() => server.resetHandlers());
    afterAll(() => server.close());

    function givenATokenResponse(
        expected: { clientId: string; clientSecret: string },
        response: { access_token: string },
        status: number = 200,
        rawBody: string | null = null
    ) {
        const handler = rest.post(`${baseUrl}/v1/oauth2/token`, async ({ request }) => {
            const authHeader = request.headers.get("authorization");
            const expectedCredentials = Buffer.from(
                `${expected.clientId}:${expected.clientSecret}`
            ).toString("base64");

            expect(authHeader).toBe(`Basic ${expectedCredentials}`);

            const body = await request.text();
            expect(body).toBe("grant_type=client_credentials");

            if (status !== 200) {
                return new Response(rawBody ?? "Unauthorized", { status });
            }

            return new Response(JSON.stringify(response), {
                status,
                headers: { "Content-Type": "application/json" },
            });
        });

        server.use(handler);
    }

    function givenAnOrderResponse(
        expected: {
            accessToken: string;
            amount: number;
            currency: string;
        },
        response: {
            id: string;
            links: { rel: string; href: string; method: string }[];
        },
        status: number = 200,
        rawBody: string | null = null
    ) {
        const handler = rest.post(`${baseUrl}/v2/checkout/orders`, async ({ request }) => {
            const authHeader = request.headers.get("authorization");
            expect(authHeader).toBe(`Bearer ${expected.accessToken}`);

            const body = await request.json();

            expect(body).toEqual({
                intent: "CAPTURE",
                purchase_units: [
                    {
                        amount: {
                            currency_code: expected.currency,
                            value: expected.amount,
                        },
                    },
                ],
                application_context: {
                    brand_name: "TF2-QuickServer",
                    landing_page: "LOGIN",
                    user_action: "PAY_NOW",
                },
            });

            if (status !== 200) {
                return new Response(rawBody ?? "Bad Request", { status });
            }

            return new Response(JSON.stringify(response), {
                status,
                headers: { "Content-Type": "application/json" },
            });
        });

        server.use(handler);
    }

    return {
        givenATokenResponse,
        givenAnOrderResponse,
    };
}

const environments = [
    { sandbox: true, baseUrl: "https://api.sandbox.paypal.com" },
    { sandbox: false, baseUrl: "https://api.paypal.com" },
];

describe.each(environments)("PaypalPaymentService in %s environment", ({ sandbox, baseUrl }) => {
    const { givenATokenResponse, givenAnOrderResponse } = createTestEnvironment(baseUrl);

    it("should create a PayPal order and return a CreditOrder", async () => {
        const mockAccessToken = chance.guid();
        const mockOrderId = chance.string({ length: 10, pool: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890' });
        const mockApprovalLink = chance.url({ domain: "paypal.com", path: "approve-me" });

        const clientId = chance.string({ length: 12 });
        const clientSecret = chance.string({ length: 24 });

        const amount = chance.floating({ min: 5, max: 100, fixed: 2 })
        const currency = "USD";
        const userId = chance.guid();

        const service = new PaypalPaymentService({
            clientId,
            clientSecret,
            sandbox,
        });

        givenATokenResponse(
            { clientId, clientSecret },
            { access_token: mockAccessToken }
        );

        givenAnOrderResponse(
            {
                accessToken: mockAccessToken,
                amount,
                currency,
            },
            {
                id: mockOrderId,
                links: [
                    {
                        rel: "approve",
                        href: mockApprovalLink,
                        method: "GET",
                    },
                ],
            }
        );

        const request: CreditOrderRequest = {
            amount,
            currency,
            userId,
        };

        const order = await service.createCreditsOrder(request);

        expect(order).toMatchObject({
            id: mockOrderId,
            amount: request.amount,
            currency: request.currency,
            userId: request.userId,
            status: "pending",
            link: mockApprovalLink,
        });

        expect(order.createdAt).toBeInstanceOf(Date);
        expect(order.updatedAt).toBeInstanceOf(Date);
    });

    it("should throw an error if token generation fails", async () => {
        const clientId = chance.string({ length: 12 });
        const clientSecret = chance.string({ length: 24 });
        const service = new PaypalPaymentService({ clientId, clientSecret, sandbox });

        givenATokenResponse(
            { clientId, clientSecret },
            { access_token: "" }, // won't be used since status !== 200
            401,
            "Invalid client credentials"
        );

        const request: CreditOrderRequest = {
            amount: 10.00,
            currency: "USD",
            userId: chance.guid(),
        };

        await expect(service.createCreditsOrder(request)).rejects.toThrow(
            "Failed to get access token: Invalid client credentials"
        );
    });

    it("should throw an error if order creation fails", async () => {
        const clientId = chance.string({ length: 12 });
        const clientSecret = chance.string({ length: 24 });
        const accessToken = chance.guid();

        const service = new PaypalPaymentService({ clientId, clientSecret, sandbox });

        const request: CreditOrderRequest = {
            amount: 15.99,
            currency: "USD",
            userId: chance.guid(),
        };

        givenATokenResponse(
            { clientId, clientSecret },
            { access_token: accessToken }
        );

        givenAnOrderResponse(
            {
                accessToken,
                amount: request.amount,
                currency: request.currency,
            },
            {
                id: "",
                links: [],
            },
            400,
            "Invalid amount"
        );

        await expect(service.createCreditsOrder(request)).rejects.toThrow(
            "Failed to create PayPal order: Invalid amount"
        );
    });

    it("should throw an error if no approval link is found", async () => {
        const clientId = chance.string({ length: 12 });
        const clientSecret = chance.string({ length: 24 });
        const accessToken = chance.guid();

        const service = new PaypalPaymentService({ clientId, clientSecret, sandbox });

        const request: CreditOrderRequest = {
            amount: 20.00,
            currency: "USD",
            userId: chance.guid(),
        };

        givenATokenResponse(
            { clientId, clientSecret },
            { access_token: accessToken }
        );

        givenAnOrderResponse(
            {
                accessToken,
                amount: request.amount,
                currency: request.currency,
            },
            {
                id: chance.guid(),
                links: [],
            }
        );

        await expect(service.createCreditsOrder(request)).rejects.toThrow(
            "No approval link found in PayPal response."
        );
    })

    it("should validate a webhook signature and return true when verification succeeds", async () => {
        const clientId = chance.string({ length: 12 });
        const clientSecret = chance.string({ length: 24 });
        const accessToken = chance.guid();
        const service = new PaypalPaymentService({ clientId, clientSecret, sandbox });
    
        // Setup the /v1/oauth2/token response
        givenATokenResponse(
            { clientId, clientSecret },
            { access_token: accessToken }
        );
    
        // Expected values
        const webhookId = chance.guid();
        const transmissionId = chance.guid();
        const transmissionTime = new Date().toISOString();
        const certUrl = chance.url({ domain: "paypal.com" });
        const authAlgo = "SHA256withRSA";
        const transmissionSig = chance.string({ length: 64 });
    
        const webhookEvent = {
            id: chance.guid(),
            event_type: "CHECKOUT.ORDER.APPROVED",
            resource: {
                id: chance.guid()
            }
        };
    
        // Setup the /v1/notifications/verify-webhook-signature response
        const handler = rest.post(`${baseUrl}/v1/notifications/verify-webhook-signature`, async ({ request }) => {
            const authHeader = request.headers.get("authorization");
            expect(authHeader).toBe(`Bearer ${accessToken}`);
    
            const body = await request.json();
            expect(body).toEqual({
                webhook_id: webhookId,
                transmission_id: transmissionId,
                transmission_time: transmissionTime,
                cert_url: certUrl,
                auth_algo: authAlgo,
                transmission_sig: transmissionSig,
                webhook_event: webhookEvent,
            });
    
            return new Response(
                JSON.stringify({ verification_status: "SUCCESS" }),
                { status: 200, headers: { "Content-Type": "application/json" } }
            );
        });
    
        // Use the handler
        setupServer(handler).listen({ onUnhandledRequest: 'error' });
    
        const isValid = await service.validateWebhookSignature({
            headers: {},
            body: JSON.stringify(webhookEvent),
            signatureVerification: {
                webhookId,
                transmissionId,
                transmissionTime,
                certUrl,
                authAlgo,
                transmissionSig
            }
        });
    
        expect(isValid).toBe(true);
    });

});
