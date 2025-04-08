import { Knex } from "knex";
import { UserCreditsRepository } from "../../core/repository/UserCreditsRepository";

export class SQliteUserCreditsRepository implements UserCreditsRepository {

    constructor(private readonly dependencies: {
        knex: Knex
    }) {}

    async subtractCredits(args: { userId: string; credits: number; }): Promise<number> {
        const { knex } = this.dependencies;
        const { userId, credits } = args;

        const result = await knex('user_credits')
            .where({ user_id: userId })
            .decrement('credits', credits)
            .returning('credits')

        return result[0].credits;
    }

    async getCredits(args: { userId: string; }): Promise<number> {
        const { knex } = this.dependencies;
        const { userId } = args;

        const result = await knex('user_credits')
            .where({ user_id: userId })
            .first();

        return result?.credits || 0;
    }

}