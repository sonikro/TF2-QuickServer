import { Knex } from "knex";
import { UserRepository } from "../../core/repository/UserRepository";
import { User } from "../../core/domain/User";

export class SQliteUserRepository implements UserRepository {

    constructor(private readonly dependencies: {
        knex: Knex
    }){}

    async getById(id: string): Promise<User | null> {
        const { knex } = this.dependencies;
        const user = await knex("user").where({ id }).first();
        if (!user) {
            return null;
        }
        return {
            id: user.id,
            steamIdText: user.steamIdText
        };
    }

    async upsert(user: User): Promise<void> {
        const { knex } = this.dependencies;
        await knex("user").insert(user).onConflict("id").merge();
    }
}