import { CreditOrder } from "../domain/CreditOrder";

export interface CreditOrdersRepository {
    insert(creditOrder: CreditOrder): Promise<void>;
    update(creditOrder: CreditOrder): Promise<void>;
    findById(id: string): Promise<CreditOrder | null>;
    findByUserId(userId: string): Promise<CreditOrder[]>;
}