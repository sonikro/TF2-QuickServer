import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
    await knex.schema.createTable("guild_parameters", (table) => {
        table.string("guild_id").primary();
        table.json("environment_variables").nullable();
    });
}


export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists("guild_parameters");
}

