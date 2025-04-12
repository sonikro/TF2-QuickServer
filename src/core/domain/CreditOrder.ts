export type CreditOrderStatus = "pending" | "paid" | "failed"

export type CreditOrder = {
    id: string;
    amount: number;
    credits?: number;
    currency: string;
    userId: string;
    createdAt: Date;
    updatedAt: Date;
    status: CreditOrderStatus;
    link: string;
}