import { http as rest } from "msw";
import { setupServer } from "msw/node";
import { beforeAll, afterAll, afterEach, expect, describe, it } from "vitest";
import { CreditOrderRequest } from "../../core/domain/CreditOrderRequest";
import { AdyenPaymentService } from "./AdyenPaymentService";
import Chance from "chance";

const chance = new Chance();

export function createTestEnvironment(baseUrl: string) {
    const server = setupServer();

    beforeAll(() => server.listen());
    afterEach(() => server.resetHandlers());
    afterAll(() => server.close());

    function givenAnOrderResponse(
        expected: {
            apiKey: string;
            amount: number;
            currency: string;
            merchantAccount: string;
        },
        response: {
            id: string;
            url: string;
        },
        status: number = 200,
        rawBody: string | null = null
    ) {
        const handler = rest.post(`${baseUrl}/paymentLinks`, async ({ request }) => {
            const authHeader = request.headers.get("X-API-Key");
            expect(authHeader).toBe(expected.apiKey);

            const body = await request.json();

            expect(body).toEqual({
                amount: {
                    currency: expected.currency,
                    value: Math.round(expected.amount * 100),
                },
                reference: expect.stringMatching(/^TF2-Quick-Server-.+/),
                merchantAccount: expected.merchantAccount,
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
        givenAnOrderResponse,
    };
}

const environments = [
    { environment: "test", baseUrl: "https://checkout-test.adyen.com/v71" },
    { environment: "live", baseUrl: "https://checkout-live.adyen.com/v71" },
];

describe.each(environments)("AdyenPaymentService in %s environment", ({ environment, baseUrl }) => {
    const { givenAnOrderResponse } = createTestEnvironment(baseUrl);

    it("should create an Adyen payment link and return a CreditOrder", async () => {
        const mockOrderId = chance.guid();
        const mockPaymentLink = chance.url({ domain: "adyen.com", path: "pay" });

        const apiKey = chance.string({ length: 32 });
        const merchantAccount = chance.string({ length: 16 });
        const amount = chance.floating({ min: 5, max: 100, fixed: 2 });
        const hmacKey = chance.string({ length: 32 });
        const currency = "USD";
        const userId = chance.guid();

        const service = new AdyenPaymentService({
            apiKey,
            environment: environment as "live" | "test",
            merchantAccount,
            hmacKey,
        });

        givenAnOrderResponse(
            {
                apiKey,
                amount,
                currency,
                merchantAccount,
            },
            {
                id: mockOrderId,
                url: mockPaymentLink,
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
            link: mockPaymentLink,
        });

        expect(order.createdAt).toBeInstanceOf(Date);
        expect(order.updatedAt).toBeInstanceOf(Date);
    });

    it("should throw an error if payment link creation fails", async () => {
        const apiKey = chance.string({ length: 32 });
        const merchantAccount = chance.string({ length: 16 });
        const hmacKey = chance.string({ length: 32 });

        const service = new AdyenPaymentService({ apiKey, environment: environment as "live" | "test", merchantAccount, hmacKey });

        const request: CreditOrderRequest = {
            amount: 15.99,
            currency: "USD",
            userId: chance.guid(),
        };

        givenAnOrderResponse(
            {
                apiKey,
                amount: request.amount,
                currency: request.currency,
                merchantAccount,
            },
            {
                id: "",
                url: "",
            },
            400,
            "Invalid amount"
        );

        await expect(service.createCreditsOrder(request)).rejects.toThrow(
            "Failed to create Adyen payment link: Invalid amount"
        );
    });

});