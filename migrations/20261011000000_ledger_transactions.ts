import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('ledger_transactions', (table) => {
    table.increments('id').primary();
    table.text('occurred_at').notNullable();
    table.text('type').notNullable();
    table.float('amount_original').notNullable();
    table.text('currency_original').notNullable();
    table.integer('amount_brl').notNullable();
    table.float('fx_rate').notNullable();
    table.text('fx_source').notNullable();
    table.text('source').notNullable();
    table.text('actor_discord_id').notNullable();
    table.text('dedupe_key').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.unique('dedupe_key', { indexName: 'uq_ledger_dedupe' });
  });
}


export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('ledger_transactions');
}
