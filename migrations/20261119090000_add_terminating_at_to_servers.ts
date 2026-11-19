import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
    await knex.schema.alterTable("servers", (table) => {
        table.timestamp("terminatingAt").nullable();
    });

    // Backfill from createdAt so rows already stuck in 'terminating' become
    // eligible for cleanup immediately; a deploy restarts the bot, so no
    // in-flight deletion survives to be raced by this approximation.
    await knex("servers")
        .where({ status: "terminating" })
        .update({ terminatingAt: knex.ref("createdAt") });
}


export async function down(knex: Knex): Promise<void> {
    // ALTER TABLE directly: knex rebuilds the table for dropColumn on SQLite,
    // which silently drops the servers/server_activity/server_history triggers.
    await knex.schema.raw(`ALTER TABLE servers DROP COLUMN terminatingAt`);
}
