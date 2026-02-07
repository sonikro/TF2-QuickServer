import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
    await knex.raw(`
        CREATE TRIGGER player_connection_history_cleanup
        AFTER INSERT ON player_connection_history
        BEGIN
            DELETE FROM player_connection_history
            WHERE timestamp < datetime('now', '-90 days');
        END;
    `);
}


export async function down(knex: Knex): Promise<void> {
    await knex.raw("DROP TRIGGER IF EXISTS player_connection_history_cleanup;");
}

