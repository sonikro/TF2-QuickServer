import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
    await knex.schema.createTable("guild_variants", (table) => {
        table.increments("id").primary();
        table.string("guild_id").notNullable();
        table.string("variant_name").notNullable();
        table.string("display_name").nullable();
        table.string("hostname").nullable();
        table.json("default_cfgs").nullable();
        table.json("admins").nullable();
        table.string("image").nullable();
        table.timestamps(true, true);
        table.unique(["guild_id", "variant_name"]);
        table.index("guild_id");
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists("guild_variants");
}
