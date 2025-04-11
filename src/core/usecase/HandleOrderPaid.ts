import { CreditOrdersRepository } from "../repository/CreditOrdersRepository";
import { UserCreditsRepository } from "../repository/UserCreditsRepository";

export class HandleOrderPaid {

    constructor(private readonly dependencies: {
        userCreditsRepository: UserCreditsRepository,
        creditOrdersRepository: CreditOrdersRepository
    }){}
    async execute(args: {
        orderId: string,
    }){
        const { orderId } = args;
        const { creditOrdersRepository, userCreditsRepository } = this.dependencies;

        // Find the order by ID
        const order = await creditOrdersRepository.findById(orderId);
        if (!order) {
            throw new Error(`Order with ID ${orderId} not found`);
        }

        // Update the order status to paid
        order.status = 'paid';

         await creditOrdersRepository.update(order);

        // Update the user's credits
        
        const newCredits = await userCreditsRepository.addCredits({
            credits: order.credits,
            userId: order.userId
        });

        console.log(`User ${order.userId} has been credited with ${order.credits} credits.`); 
        return {
            order,
            newCredits
        }
    }
}