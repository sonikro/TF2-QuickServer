import knex, { Knex } from "knex";
import dbConfig from "../../knexfile";

const OPENING_DEDUPE_KEY = 'opening:seed';
const OPENING_AMOUNT_BRL_CENTS = 13000;
const OPENING_OCCURRED_AT = '2026-10-06T12:00:00.000Z';
const OPENING_ACTOR = 'system';

type SeedLedgerOpeningParams = {
  client?: Knex;
};

export async function seedLedgerOpening(params: SeedLedgerOpeningParams): Promise<void> {
  const { client } = params;
  const db = client ?? knex(dbConfig);
  const ownsConnection = !client;
  try {
    const existing = await db('ledger_transactions').where({ dedupe_key: OPENING_DEDUPE_KEY }).first();
    if (existing) {
      console.log('Ledger opening entry already exists. Skipping seed.');
      return;
    }
    await db('ledger_transactions').insert({
      occurred_at: OPENING_OCCURRED_AT,
      type: 'OPENING',
      amount_original: 130,
      currency_original: 'BRL',
      amount_brl: OPENING_AMOUNT_BRL_CENTS,
      fx_rate: 1,
      fx_source: 'NONE',
      source: 'Opening balance from #money history',
      actor_discord_id: OPENING_ACTOR,
      dedupe_key: OPENING_DEDUPE_KEY,
    });
    console.log('Ledger opening entry seeded: +130.00 BRL.');
  } finally {
    if (ownsConnection) {
      await db.destroy();
    }
  }
}

const invokedDirectly = process.argv[1]?.endsWith('seed_ledger_opening.ts');
if (invokedDirectly) {
  seedLedgerOpening({}).catch((error) => {
    console.error('Failed to seed ledger opening entry:', (error as Error).message);
    process.exit(1);
  });
}
