import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
    await knex.schema.alterTable('servers', (table) => {
        table.enum('status', ['pending', 'ready']).notNullable().defaultTo('pending');
    });
}


export async function down(knex: Knex): Promise<void> {
    await knex.schema.alterTable('servers', (table) => {
        table.dropColumn('status');
    });
}

