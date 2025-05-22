import { Knex } from "knex";
import { GuildParameters } from "../../core/domain/GuildParameters";
import { GuildParametersRepository } from "../../core/repository/GuildParametersRepository";

export class SQliteGuildParametersRepository implements GuildParametersRepository {
    constructor(private readonly dependencies: { knex: Knex }) {}

    async findById(guildId: string): Promise<GuildParameters | null> {
        const result = await this.dependencies.knex("guild_parameters")
            .where({ guild_id: guildId })
            .first();

        if (!result) return null;

        return {
            guild_id: result.guild_id,
            environment_variables: result.environment_variables ? JSON.parse(result.environment_variables) : null,
        };
    }
}