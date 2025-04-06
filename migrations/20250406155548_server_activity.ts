import type { Knex } from "knex";

// The `server_activity` table is designed to have a 1:1 relationship with the `servers` table.
// Its responsibility is to track server-specific properties such as when the server was last empty
// and the last time it was checked.

export async function up(knex: Knex): Promise<void> {
    // Create the `server_activity` table
    await knex.schema.createTable("server_activity", (table) => {
        // The `serverId` column is the primary key and references the `serverId` column in the `servers` table.
        // If a row in the `servers` table is deleted, the corresponding row in `server_activity` will also be deleted (CASCADE).
        table.string("serverId").primary().references("serverId").inTable("servers").onDelete("CASCADE");

        // The `emptySince` column tracks the timestamp of when the server became empty. It is nullable.
        table.timestamp("emptySince").nullable();

        // The `lastCheckedAt` column tracks the timestamp of the last time the server was checked. It is nullable.
        table.timestamp("lastCheckedAt").nullable();
    });

    // Create a trigger to automatically insert a row into `server_activity` whenever a new row is inserted into `servers`.
    await knex.raw(`
        CREATE TRIGGER after_server_insert
        AFTER INSERT ON servers
        BEGIN
            INSERT INTO server_activity (serverId, emptySince, lastCheckedAt)
            VALUES (NEW.serverId, NULL, NULL);
        END;
    `);
}

export async function down(knex: Knex): Promise<void> {
    // Drop the trigger to clean up after the migration is rolled back.
    await knex.raw(`DROP TRIGGER IF EXISTS after_server_insert;`);

    // Drop the `server_activity` table.
    await knex.schema.dropTableIfExists("server_activity");
}
