import { beforeAll, describe, expect, it } from "vitest";
import { HandleOrderPaid } from "./HandleOrderPaid";
import { mock } from "vitest-mock-extended";
import { CreditOrdersRepository } from "../repository/CreditOrdersRepository";
import { UserCreditsRepository } from "../repository/UserCreditsRepository";
import { when } from "vitest-when";
import { Chance } from "chance";
import { CreditOrder } from "../domain/CreditOrder";
import { EventLogger } from "../services/EventLogger";

const chance = new Chance();

const createTestEnvironment = () => {
    const creditOrdersRepository = mock<CreditOrdersRepository>();
    const userCreditsRepository = mock<UserCreditsRepository>();
    const eventLogger = mock<EventLogger>();

    const values = {
        order: {
            id: chance.guid(),
            userId: chance.guid(),
            credits: chance.integer({ min: 1, max: 1000 }),
            amount: chance.floating({ min: 1, max: 1000, fixed: 2 }),
            currency: "USD",
            status: "pending",
            link: chance.url(),
            createdAt: new Date(),
            updatedAt: new Date()
        } as CreditOrder
    };

    return {
        sut: new HandleOrderPaid({
            creditOrdersRepository,
            userCreditsRepository,
            eventLogger
        }),
        mocks: {
            creditOrdersRepository,
            userCreditsRepository
        },
        values
    };
};

describe("HandleOrderPaid", () => {
    const { sut, mocks, values } = createTestEnvironment();
    const newCredits = 100
    let result: {order: CreditOrder, newCredits: number};
    beforeAll(async () => {
        when(mocks.creditOrdersRepository.findById)
            .calledWith(values.order.id)
            .thenResolve(values.order);

        when(mocks.userCreditsRepository.addCredits)
            .calledWith({
                userId: values.order.userId,
                credits: values.order.credits!
            })
            .thenResolve(newCredits);

        result = await sut.execute({
            orderId: values.order.id
        });
    });

    it("should mark the order as paid", () => {
        expect(mocks.creditOrdersRepository.update).toHaveBeenCalledWith(
            expect.objectContaining({
                ...values.order,
                status: "paid"
            })
        );
    });

    it("should add credits to the user account", () => {
        expect(mocks.userCreditsRepository.addCredits).toHaveBeenCalledWith({
            userId: values.order.userId,
            credits: values.order.credits
        });
    });

    it("should return the updated order and new credits", () => {
        expect(result).toEqual({
            order: {
                ...values.order,
                status: "paid"
            },
            newCredits
        });
    });
});

describe("HandleOrderPaid - Error Case", () => {
    it("should throw an error if the order is not found", async () => {
        const creditOrdersRepository = mock<CreditOrdersRepository>();
        const userCreditsRepository = mock<UserCreditsRepository>();
        const eventLogger = mock<EventLogger>();

        const sut = new HandleOrderPaid({
            creditOrdersRepository,
            userCreditsRepository,
            eventLogger
        });

        const nonExistentOrderId = chance.guid();

        when(creditOrdersRepository.findById)
            .calledWith(nonExistentOrderId)
            .thenResolve(null);

        await expect(() =>
            sut.execute({ orderId: nonExistentOrderId })
        ).rejects.toThrow(`Order with ID ${nonExistentOrderId} not found`);
    });
});
