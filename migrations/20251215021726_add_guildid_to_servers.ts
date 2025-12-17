import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
    await knex.schema.alterTable("servers", (table) => {
        table.string("guild_id").nullable();
        table.index("guild_id");
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.alterTable("servers", (table) => {
        table.dropColumn("guild_id");
    });
}
