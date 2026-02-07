import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
    await knex.schema.createTable("player_connection_history", (table) => {
        table.increments("id").primary();
        table.string("steam_id_3").notNullable();
        table.string("ip_address").notNullable();
        table.string("nickname").notNullable();
        table.timestamp("timestamp").notNullable().defaultTo(knex.fn.now());
    });
}


export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists("player_connection_history");
}

