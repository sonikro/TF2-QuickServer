import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable("server_status_metrics", (table) => {
    table.dropColumn("server_id");
  });
}


export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable("server_status_metrics", (table) => {
    table.string("server_id").notNullable();
  });
}

