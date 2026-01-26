import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("server_status_metrics", (table) => {
    table.increments("id").primary();
    table.string("server_id").notNullable();
    table.string("map").notNullable();
    table.timestamp("timestamp").notNullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("server_status_metrics");
}

