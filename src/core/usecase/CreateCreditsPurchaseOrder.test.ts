import { beforeAll, describe, expect, it } from "vitest";
import { CreateCreditsPurchaseOrder } from "./CreateCreditsPurchaseOrder";
import { mock } from "vitest-mock-extended";
import { PaymentService } from "../services/PaymentService";
import { CreditOrdersRepository } from "../repository/CreditOrdersRepository";
import { when } from "vitest-when";
import { Chance } from "chance";

const chance = new Chance();
const createTestEnvironment = () => {


    const paymentService = mock<PaymentService>();
    const creditOrdersRepository = mock<CreditOrdersRepository>();
    const values = {
        userId: chance.guid(),
        creditsAmount: chance.integer({ min: 60, max: 1000 }),
        orderId: chance.guid(),
        orderLink: chance.url()
    }
    return {
        sut: new CreateCreditsPurchaseOrder({
            creditOrdersRepository,
            paymentService
        }),
        mocks: {
            paymentService,
            creditOrdersRepository
        },
        values
    }
}
describe("CreateCreditsPurchaseOrder", () => {
    const { sut, mocks, values } = createTestEnvironment();
    beforeAll(async () => {
        when(mocks.paymentService.createCreditsOrder).calledWith({
            userId: values.userId,
            amount: values.creditsAmount * 0.002,
            currency: 'USD'
        }).thenResolve({
            id: values.orderId,
            amount: values.creditsAmount * 0.002,
            currency: 'USD',
            userId: values.userId,
            createdAt: new Date(),
            updatedAt: new Date(),
            status: 'pending',
            link: values.orderLink
        })

        await sut.execute({
            userId: values.userId,
            creditsAmount: values.creditsAmount
        })
    })

    it("should call the payment service with the correct order value", () => {
        expect(mocks.paymentService.createCreditsOrder).toHaveBeenCalledWith({
            userId: values.userId,
            amount: values.creditsAmount * 0.002,
            currency: 'USD'
        })   
    })

    it("should persist the order in the database", () => {
        expect(mocks.creditOrdersRepository.insert).toHaveBeenCalledWith({
            id: values.orderId,
            amount: values.creditsAmount * 0.002,
            currency: 'USD',
            userId: values.userId,
            createdAt: expect.any(Date),
            updatedAt: expect.any(Date),
            status: 'pending',
            link: values.orderLink
        })
    })
})