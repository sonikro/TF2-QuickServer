import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';
import { HandleOrderPaid } from '../../core/usecase/HandleOrderPaid';
import { PaypalPaymentService } from '../../providers/services/PaypalPaymentService';
import { initializeExpress } from './express';
import { Client as DiscordClient, User } from 'discord.js';
import { when } from 'vitest-when';
import { EventLogger } from '../../core/services/EventLogger';
import { AdyenPaymentService } from '../../providers/services/AdyenPaymentService';

describe("initializeExpress", () => {
    const handleOrderPaid = mock<HandleOrderPaid>();
    const paypalService = mock<PaypalPaymentService>();
    const adyenPaymentService = mock<AdyenPaymentService>();
    const discordUser = mock<User>()
    const discordClient = mock<DiscordClient>();
    const eventLogger = mock<EventLogger>();
    discordClient.users = mock()
    discordClient.users.fetch = vi.fn().mockResolvedValue(discordUser);

    let app: ReturnType<typeof initializeExpress>;

    beforeEach(() => {
        vi.clearAllMocks();
        app = initializeExpress({ handleOrderPaid, paypalService, discordClient, eventLogger, adyenPaymentService });
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
            const newCredits = 200

            when(handleOrderPaid.execute)
                .calledWith({ orderId: testOrderId })
                .thenResolve({
                    newCredits,
                    order: mock()
                })

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
            expect(discordUser.send).toHaveBeenCalledWith(`✅ Your order has been paid! You now have **${newCredits}** credits.`);
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

    describe("POST /adyen-webhook", () => {
        it("should call handleOrderPaid when Adyen webhook is valid and event is successful", async () => {
            const testOrderId = "ORDER456";

            const fakeWebhookEvent: any = {
                notificationItems: [
                    {
                        NotificationRequestItem: {
                            eventCode: "AUTHORISATION",
                            success: "true",
                            pspReference: "PSP123456789",
                            additionalData: {
                                paymentLinkId: testOrderId,
                            }
                        }
                    }
                ]
            };

            const newCredits = 300;

            when(handleOrderPaid.execute)
                .calledWith({ orderId: testOrderId })
                .thenResolve({
                    newCredits,
                    order: mock()
                });

            when(adyenPaymentService.validateWebhookSignature)
                .calledWith({
                    notificationRequestItem: fakeWebhookEvent.notificationItems[0].NotificationRequestItem
                })
                .thenReturn(true);

            const response = await request(app)
                .post("/adyen-webhook")
                .send(fakeWebhookEvent)
                .set("Content-Type", "application/json");

            expect(response.status).toBe(200);
            expect(handleOrderPaid.execute).toHaveBeenCalledWith({ orderId: testOrderId });
            expect(discordUser.send).toHaveBeenCalledWith(`✅ Your payment has been authorised! You now have **${newCredits}** credits.`);
        });

        it("should return 400 if invalid Adyen webhook signature", async () => {
            const fakeWebhookEvent: any = {
                notificationItems: [
                    {
                        NotificationRequestItem: {
                            eventCode: "AUTHORISATION",
                            success: "true",
                            pspReference: "PSP123456789",
                        }
                    }
                ]
            };

            when(adyenPaymentService.validateWebhookSignature)
                .calledWith({
                    notificationRequestItem: fakeWebhookEvent.notificationItems[0].NotificationRequestItem
                })
                .thenReturn(false);

            const response = await request(app)
                .post("/adyen-webhook")
                .send(fakeWebhookEvent)
                .set("Content-Type", "application/json");

            expect(response.status).toBe(400);
            expect(handleOrderPaid.execute).not.toHaveBeenCalled();
        })
        it("should log payment failure when Adyen webhook event is unsuccessful", async () => {
            const fakeWebhookEvent: any = {
                notificationItems: [
                    {
                        NotificationRequestItem: {
                            eventCode: "AUTHORISATION",
                            success: "false",
                            pspReference: "PSP123456789",
                        }
                    }
                ]
            } ;

            when(adyenPaymentService.validateWebhookSignature)
                .calledWith({
                    notificationRequestItem: fakeWebhookEvent.notificationItems[0].NotificationRequestItem
                })
                .thenReturn(true);

            const response = await request(app)
                .post("/adyen-webhook")
                .send(fakeWebhookEvent)
                .set("Content-Type", "application/json");

            expect(response.status).toBe(200);
            expect(eventLogger.log).toHaveBeenCalledWith({
                actorId: 'adyen-webhook',
                eventMessage: `Payment failed for order PSP123456789`
            });
            expect(handleOrderPaid.execute).not.toHaveBeenCalled();
        })

        it("should return 400 when Adyen webhook event is missing notification items", async () => {
            const fakeWebhookEvent = {
            };

            const response = await request(app)
                .post("/adyen-webhook")
                .send(fakeWebhookEvent)
                .set("Content-Type", "application/json");

            expect(response.status).toBe(400);
            expect(handleOrderPaid.execute).not.toHaveBeenCalled();
        });

        it("should not call handleOrderPaid for non-AUTHORISATION events", async () => {
            const fakeWebhookEvent: any = {
                notificationItems: [
                    {
                        NotificationRequestItem: {
                            eventCode: "SOMETHING_ELSE",
                        }
                    }
                ]
            } ;

            when(adyenPaymentService.validateWebhookSignature)
                .calledWith({
                    notificationRequestItem: fakeWebhookEvent.notificationItems[0].NotificationRequestItem
                })
                .thenReturn(true);

            const response = await request(app)
                .post("/adyen-webhook")
                .send(fakeWebhookEvent)
                .set("Content-Type", "application/json");

            expect(response.status).toBe(200);
            expect(handleOrderPaid.execute).not.toHaveBeenCalled();
        });
    });
});
