import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable("servers", (table) => {
    table.bigInteger("sv_logsecret").unique();
  });
}


export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable("servers", (table) => {
    table.dropColumn("sv_logsecret");
  });
}

