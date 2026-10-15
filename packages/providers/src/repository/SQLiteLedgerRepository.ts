import { Knex } from "knex";
import { LedgerTransaction, NewLedgerEntry } from "@tf2qs/core";
import { LedgerRepository } from "@tf2qs/core";

type LedgerRow = {
  id: number;
  occurred_at: string;
  type: LedgerTransaction['type'];
  amount_original: number;
  currency_original: LedgerTransaction['currencyOriginal'];
  amount_brl_cents: number;
  fx_rate: number;
  fx_source: LedgerTransaction['fxSource'];
  source: string;
  actor_discord_id: string;
  dedupe_key: string;
  created_at: string;
};

export class SQLiteLedgerRepository implements LedgerRepository {
  constructor(private readonly dependencies: { knex: Knex }) {}

  async insert(params: { entry: NewLedgerEntry }): Promise<LedgerTransaction> {
    const { entry } = params;
    const [id] = await this.dependencies.knex('ledger_transactions').insert(toRow(entry));
    const row = await this.dependencies.knex('ledger_transactions').where({ id }).first();
    return toDomain(row as LedgerRow);
  }

  async existsByDedupeKey(params: { dedupeKey: string }): Promise<boolean> {
    const { dedupeKey } = params;
    const row = await this.dependencies.knex('ledger_transactions')
      .where({ dedupe_key: dedupeKey })
      .first();
    return Boolean(row);
  }

  async getBalance(): Promise<number> {
    const row = await this.dependencies.knex('ledger_transactions')
      .sum('amount_brl_cents as total')
      .first();
    return Number((row as { total: number | null } | undefined)?.total ?? 0);
  }

  async listRecent(params: { limit: number }): Promise<LedgerTransaction[]> {
    const { limit } = params;
    const rows = await this.dependencies.knex('ledger_transactions')
      .orderBy('id', 'desc')
      .limit(limit);
    return (rows as LedgerRow[]).map(toDomain);
  }
}

function toRow(entry: NewLedgerEntry): Omit<LedgerRow, 'id' | 'created_at'> {
  return {
    occurred_at: entry.occurredAt.toISOString(),
    type: entry.type,
    amount_original: entry.amountOriginal,
    currency_original: entry.currencyOriginal,
    amount_brl_cents: entry.amountBrlCents,
    fx_rate: entry.fxRate,
    fx_source: entry.fxSource,
    source: entry.source,
    actor_discord_id: entry.actorDiscordId,
    dedupe_key: entry.dedupeKey,
  };
}

function toDomain(row: LedgerRow): LedgerTransaction {
  return {
    id: row.id,
    occurredAt: new Date(row.occurred_at),
    type: row.type,
    amountOriginal: row.amount_original,
    currencyOriginal: row.currency_original,
    amountBrlCents: row.amount_brl_cents,
    fxRate: row.fx_rate,
    fxSource: row.fx_source,
    source: row.source,
    actorDiscordId: row.actor_discord_id,
    dedupeKey: row.dedupe_key,
    createdAt: new Date(row.created_at),
  };
}
