import { CreditOrder } from "../domain/CreditOrder";
import { CreditOrdersRepository } from "../repository/CreditOrdersRepository";
import { PaymentService } from "../services/PaymentService";

export class CreateCreditsPurchaseOrder {

    constructor(private readonly dependencies: {
        paymentService: PaymentService;
        creditOrdersRepository: CreditOrdersRepository
    }) {}

    async execute(args: {
        userId: string;
        creditsAmount: number;
    }): Promise<CreditOrder>{

        const {creditOrdersRepository , paymentService} = this.dependencies;

        const { userId, creditsAmount } = args;

        const pricePerCredit = 0.002; // Default price per credit

        // Create a new credit order
        const creditOrder = await paymentService.createCreditsOrder({
            userId,
            amount: (creditsAmount * pricePerCredit),
            currency: 'USD',
        })

        // Save the order to the database
        await creditOrdersRepository.insert({
            id: creditOrder.id,
            amount: creditOrder.amount,
            currency: creditOrder.currency,
            userId: creditOrder.userId,
            createdAt: new Date(),
            updatedAt: new Date(),
            status: 'pending',
            link: creditOrder.link,
            credits: creditsAmount,
        });

        return creditOrder

    }
}