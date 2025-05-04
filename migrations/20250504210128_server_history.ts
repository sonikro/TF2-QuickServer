import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
    // Create the `server_history` table
    await knex.schema.createTable("server_history", (table) => {
        table.string("serverId").primary(); // Server ID (Primary Key)
        table.timestamp("createdAt").nullable(); // Timestamp when the server was created
        table.string("createdBy").nullable(); // User who created the server
        table.timestamp("terminatedAt").nullable(); // Timestamp when the server was terminated
        table.string("region").notNullable(); // Server region
        table.string("variant").notNullable(); // Server variant
    });

    // Create a trigger to insert into `server_history` whenever a record is inserted into `servers`
    await knex.raw(`
        CREATE TRIGGER insert_server_history
        AFTER INSERT ON servers
        BEGIN
            INSERT INTO server_history (serverId, createdAt, createdBy, region, variant)
            VALUES (NEW.serverId, NEW.createdAt, NEW.createdBy, NEW.region, NEW.variant);
        END;
    `);

    // Create a trigger to update `terminatedAt` in `server_history` when a record is deleted from `servers`
    await knex.raw(`
        CREATE TRIGGER update_terminated_at
        AFTER DELETE ON servers
        BEGIN
            UPDATE server_history
            SET terminatedAt = (strftime('%s', 'now') || substr(strftime('%f', 'now'), 4))
            WHERE serverId = OLD.serverId;
        END;
    `);
}

export async function down(knex: Knex): Promise<void> {
    // Drop the triggers
    await knex.raw(`DROP TRIGGER IF EXISTS insert_server_history;`);
    await knex.raw(`DROP TRIGGER IF EXISTS update_terminated_at;`);

    // Drop the `server_history` table
    await knex.schema.dropTableIfExists("server_history");
}

