import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
    await knex.schema.createTable('user_credits', (table) => {
        table.string('user_id').primary();
        table.integer('credits').notNullable().defaultTo(0);
    })
}


export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists('user_credits');
}

