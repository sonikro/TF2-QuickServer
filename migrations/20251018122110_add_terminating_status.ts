import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
    // Use legacy_alter_table to modify the check constraint
    await knex.schema.raw(`PRAGMA legacy_alter_table = ON`);
    await knex.schema.raw(`PRAGMA foreign_keys = OFF`);

    // Drop the old status column and recreate it with the new check constraint
    await knex.schema.raw(`ALTER TABLE servers RENAME COLUMN status TO status_old`);
    
    await knex.schema.raw(`
        ALTER TABLE servers ADD COLUMN status text CHECK (status IN ('pending', 'ready', 'terminating')) DEFAULT 'pending'
    `);

    // Copy data from old column to new column
    await knex.schema.raw(`UPDATE servers SET status = status_old`);

    // Drop the old column
    await knex.schema.raw(`ALTER TABLE servers DROP COLUMN status_old`);

    await knex.schema.raw(`PRAGMA legacy_alter_table = OFF`);
    await knex.schema.raw(`PRAGMA foreign_keys = ON`);
}

export async function down(knex: Knex): Promise<void> {
    // Revert by removing the new constraint and restoring the old one
    await knex.schema.raw(`PRAGMA legacy_alter_table = ON`);
    await knex.schema.raw(`PRAGMA foreign_keys = OFF`);

    // Rename current status to status_old
    await knex.schema.raw(`ALTER TABLE servers RENAME COLUMN status TO status_old`);
    
    // Create status column with old constraint
    await knex.schema.raw(`
        ALTER TABLE servers ADD COLUMN status text CHECK (status IN ('pending', 'ready')) DEFAULT 'pending'
    `);

    // Copy data, filtering out terminating status
    await knex.schema.raw(`UPDATE servers SET status = status_old WHERE status_old IN ('pending', 'ready')`);

    // Drop the old column
    await knex.schema.raw(`ALTER TABLE servers DROP COLUMN status_old`);

    await knex.schema.raw(`PRAGMA legacy_alter_table = OFF`);
    await knex.schema.raw(`PRAGMA foreign_keys = ON`);
}
