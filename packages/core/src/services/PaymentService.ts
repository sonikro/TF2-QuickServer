import { CreditOrder } from "../domain/CreditOrder";
import { CreditOrderRequest } from "../domain/CreditOrderRequest";

export interface PaymentService {
    createCreditsOrder(request: CreditOrderRequest): Promise<CreditOrder>;
}