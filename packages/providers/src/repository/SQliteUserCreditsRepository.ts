import { Knex } from "knex";
import { UserCreditsRepository } from "@tf2qs/core/src/repository/UserCreditsRepository";

export class SQliteUserCreditsRepository implements UserCreditsRepository {

    constructor(private readonly dependencies: {
        knex: Knex
    }) {}

    async subtractCredits(args: { userId: string; credits: number; }): Promise<number> {
        const { knex } = this.dependencies;
        const { userId, credits } = args;

        return await knex.transaction(async (trx) => {
            // Fetch the current credits with a row lock (if needed)
            const currentCredits = await trx('user_credits')
                .where({ user_id: userId })
                .select('credits')
                .first();

            // Calculate the new credits, ensuring it doesn't go below zero
            const newCredits = Math.max((currentCredits?.credits || 0) - credits, 0);

            // Update the credits
            await trx('user_credits')
                .where({ user_id: userId })
                .update({ credits: newCredits });

            // Return the updated credits
            return newCredits;
        });
    }

    async getCredits(args: { userId: string; }): Promise<number> {
        const { knex } = this.dependencies;
        const { userId } = args;

        const result = await knex('user_credits')
            .where({ user_id: userId })
            .first();

        return result?.credits || 0;
    }

    async addCredits(args: { userId: string; credits: number; }): Promise<number> {
        const { knex } = this.dependencies;
        const { userId, credits } = args;

        return await knex.transaction(async (trx) => {
            // Fetch the current credits with a row lock (if needed)
            const currentCredits = await trx('user_credits')
                .where({ user_id: userId })
                .select('credits')
                .first();

            // Calculate the new credits
            const newCredits = (currentCredits?.credits || 0) + credits;

            // Update the credits
            await trx('user_credits')
                .where({ user_id: userId })
                .update({ credits: newCredits });

            // Return the updated credits
            return newCredits;
        });
    }

}