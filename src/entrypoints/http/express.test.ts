import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { HandleOrderPaid } from '../../core/usecase/HandleOrderPaid';
import { PaypalPaymentService } from '../../providers/services/PaypalPaymentService';
import { initializeExpress } from './express';

describe("initializeExpress", () => {
    const handleOrderPaid = mock<HandleOrderPaid>();
    const paypalService = mock<PaypalPaymentService>();
    let app: ReturnType<typeof initializeExpress>;

    beforeEach(() => {
        vi.clearAllMocks();
        app = initializeExpress({ handleOrderPaid, paypalService });
    });

    it("should return 404 for unknown routes", async () => {
        const response = await request(app).get("/non-existent");
        expect(response.status).toBe(404);
    });

    describe("POST /paypal-webhook", () => {
        it("should call handleOrderPaid when PayPal webhook is valid and approved", async () => {
            const testOrderId = "ORDER123";

            const fakeWebhookEvent = {
                event_type: "CHECKOUT.ORDER.APPROVED",
                resource: {
                    id: testOrderId
                }
            };

            // Mock validateWebhookSignature to return true
            paypalService.validateWebhookSignature.mockResolvedValue(true);

            const response = await request(app)
                .post("/paypal-webhook")
                .send(fakeWebhookEvent)
                .set("Content-Type", "application/json")
                .set("paypal-transmission-id", "test-id")
                .set("paypal-transmission-time", new Date().toISOString())
                .set("paypal-transmission-sig", "test-sig")
                .set("paypal-cert-url", "https://example.com/cert")
                .set("paypal-auth-algo", "SHA256");

            expect(response.status).toBe(200);
            expect(handleOrderPaid.execute).toHaveBeenCalledWith({ orderId: testOrderId });
        });

        it("should return 400 when webhook signature is invalid", async () => {
            paypalService.validateWebhookSignature.mockResolvedValue(false);

            const response = await request(app)
                .post("/paypal-webhook")
                .send({ event_type: "CHECKOUT.ORDER.APPROVED" })
                .set("Content-Type", "application/json")
                .set("paypal-transmission-id", "test-id")
                .set("paypal-transmission-time", new Date().toISOString())
                .set("paypal-transmission-sig", "test-sig")
                .set("paypal-cert-url", "https://example.com/cert")
                .set("paypal-auth-algo", "SHA256");

            expect(response.status).toBe(400);
            expect(handleOrderPaid.execute).not.toHaveBeenCalled();
        });

        it("should not call handleOrderPaid for non-approved events", async () => {
            paypalService.validateWebhookSignature.mockResolvedValue(true);

            const response = await request(app)
                .post("/paypal-webhook")
                .send({ event_type: "OTHER.EVENT.TYPE", resource: { id: "IGNORED_ORDER" } })
                .set("Content-Type", "application/json")
                .set("paypal-transmission-id", "test-id")
                .set("paypal-transmission-time", new Date().toISOString())
                .set("paypal-transmission-sig", "test-sig")
                .set("paypal-cert-url", "https://example.com/cert")
                .set("paypal-auth-algo", "SHA256");

            expect(response.status).toBe(200);
            expect(handleOrderPaid.execute).not.toHaveBeenCalled();
        });
    });
});
