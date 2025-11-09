import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex("servers")
    .where("region", "us-east-1-bue-1a")
    .update({ region: "us-east-1-bue-1" });

  await knex("servers")
    .where("region", "us-east-1-lim-1a")
    .update({ region: "us-east-1-lim-1" });

  await knex("server_history")
    .where("region", "us-east-1-bue-1a")
    .update({ region: "us-east-1-bue-1" });

  await knex("server_history")
    .where("region", "us-east-1-lim-1a")
    .update({ region: "us-east-1-lim-1" });
}

export async function down(knex: Knex): Promise<void> {
  await knex("servers")
    .where("region", "us-east-1-bue-1")
    .update({ region: "us-east-1-bue-1a" });

  await knex("servers")
    .where("region", "us-east-1-lim-1")
    .update({ region: "us-east-1-lim-1a" });

  await knex("server_history")
    .where("region", "us-east-1-bue-1")
    .update({ region: "us-east-1-bue-1a" });

  await knex("server_history")
    .where("region", "us-east-1-lim-1")
    .update({ region: "us-east-1-lim-1a" });
}

