import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('user_ban', (table) => {
    table.string('steam_id').primary(); // SteamID as primary key
    table.string('discord_user_id').nullable(); // Optional Discord user ID
    table.timestamp('created_at').defaultTo(knex.fn.now()); // Optional: track when ban was created
    table.text('reason').nullable(); // Optional: reason for ban
  });
}


export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('user_ban');
}

