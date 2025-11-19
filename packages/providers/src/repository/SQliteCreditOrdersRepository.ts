import { Knex } from "knex";
import { CreditOrder } from "@tf2qs/core";
import { CreditOrdersRepository } from "@tf2qs/core";

export class SQliteCreditOrdersRepository implements CreditOrdersRepository {
    constructor(private readonly dependencies: { knex: Knex }) {}

    async insert(creditOrder: CreditOrder): Promise<void> {
        const { knex } = this.dependencies;
        await knex("credit_orders").insert(creditOrder);
    }

    async update(creditOrder: CreditOrder): Promise<void> {
        const { knex } = this.dependencies;
        await knex("credit_orders")
            .where({ id: creditOrder.id })
            .update(creditOrder);
    }

    async findById(id: string): Promise<CreditOrder | null> {
        const { knex } = this.dependencies;
        const result = await knex("credit_orders").where({ id }).first();
        return result || null;
    }

    async findByUserId(userId: string): Promise<CreditOrder[]> {
        const { knex } = this.dependencies;
        return await knex("credit_orders").where({ userId });
    }
}