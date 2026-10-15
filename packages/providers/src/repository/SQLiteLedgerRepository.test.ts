import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Knex, knex as createKnex } from "knex";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NewLedgerEntry } from "@tf2qs/core";
import { down, up } from "../../../../migrations/20261011000000_ledger_transactions";
import { SQLiteLedgerRepository } from "./SQLiteLedgerRepository";

function makeEntry(overrides: Partial<NewLedgerEntry> = {}): NewLedgerEntry {
  return {
    occurredAt: new Date("2026-10-06T12:00:00.000Z"),
    type: "DONATION",
    amountOriginal: 130,
    currencyOriginal: "BRL",
    amountBrlCents: 13000,
    fxRate: 1,
    fxSource: "NONE",
    source: "Monthly support",
    actorDiscordId: "226828637586849795",
    dedupeKey: "donation:2026-10-06:226828637586849795:130:BRL:Monthly support",
    ...overrides,
  };
}

describe("SQLiteLedgerRepository", () => {
  let knex: Knex;
  let directory: string;
  let sut: SQLiteLedgerRepository;

  async function makeSut() {
    directory = await mkdtemp(join(tmpdir(), "ledger-test-"));
    knex = createKnex({
      client: "sqlite3",
      connection: { filename: join(directory, "ledger.sqlite3") },
      useNullAsDefault: true,
      pool: { min: 0, max: 1 },
    });
    await up(knex);
    sut = new SQLiteLedgerRepository({ knex });
    return { sut, knex };
  }

  beforeEach(async () => {
    await makeSut();
  });

  afterEach(async () => {
    await knex.destroy();
    await rm(directory, { recursive: true, force: true });
  });

  it("should insert and read back an entry with deserialized dates", async () => {
    // Given
    const entry = makeEntry();

    // When
    const stored = await sut.insert({ entry });

    // Then
    expect(stored.id).toBeGreaterThan(0);
    expect(stored.occurredAt).toEqual(entry.occurredAt);
    expect(stored.createdAt).toBeInstanceOf(Date);
    expect(await sut.existsByDedupeKey({ dedupeKey: entry.dedupeKey })).toBe(true);
    expect(await sut.existsByDedupeKey({ dedupeKey: "donation:missing" })).toBe(false);
  });

  it("should report zero balance on an empty ledger", async () => {
    // When
    const balance = await sut.getBalance();

    // Then
    expect(balance).toBe(0);
  });

  it("should sum opening plus donation minus cost entries", async () => {
    // Given
    await sut.insert({
      entry: makeEntry({
        type: "OPENING",
        amountOriginal: 130,
        amountBrlCents: 13000,
        source: "Opening balance from #money history",
        actorDiscordId: "system",
        dedupeKey: "opening:seed",
      }),
    });
    await sut.insert({
      entry: makeEntry({
        amountOriginal: 10,
        currencyOriginal: "USD",
        amountBrlCents: 5500,
        fxRate: 5.5,
        fxSource: "PTAX",
        dedupeKey: "donation:usd-10",
      }),
    });
    await sut.insert({
      entry: makeEntry({
        type: "COST",
        amountOriginal: 5.05,
        currencyOriginal: "USD",
        amountBrlCents: -2778,
        fxRate: 5.5,
        fxSource: "PTAX",
        actorDiscordId: "system",
        dedupeKey: "cost:2026-09:bot-infra",
      }),
    });

    // When
    const balance = await sut.getBalance();

    // Then
    expect(balance).toBe(13000 + 5500 - 2778);
  });

  it("should list recent entries newest first honoring the limit", async () => {
    // Given
    await sut.insert({ entry: makeEntry({ dedupeKey: "donation:first" }) });
    await sut.insert({ entry: makeEntry({ dedupeKey: "donation:second" }) });
    await sut.insert({ entry: makeEntry({ dedupeKey: "donation:third" }) });

    // When
    const recent = await sut.listRecent({ limit: 2 });

    // Then
    expect(recent.map((entry) => entry.dedupeKey)).toEqual(["donation:third", "donation:second"]);
  });

  it("should reject a duplicate dedupe key", async () => {
    // Given
    await sut.insert({ entry: makeEntry() });

    // When
    const duplicate = sut.insert({ entry: makeEntry() });

    // Then
    await expect(duplicate).rejects.toThrow();
  });

  it("should store the balance in integer cents", async () => {
    // Given
    const amountBrlCents = 123456789;
    await sut.insert({ entry: makeEntry({ amountBrlCents }) });

    // When
    const stored = await knex("ledger_transactions")
      .select("amount_brl_cents", knex.raw("typeof(amount_brl_cents) as storage_class"))
      .first();

    // Then
    expect(typeof stored?.amount_brl_cents).toBe("number");
    expect(stored?.storage_class).toBe("integer");
    expect(stored?.amount_brl_cents).toBe(amountBrlCents);
  });

  it.each([
    { description: "an unknown type", overrides: { type: "BOGUS" } },
    { description: "an unsupported currency", overrides: { currencyOriginal: "EUR" } },
    { description: "an unsupported fx source", overrides: { fxSource: "BCB" } },
    { description: "fractional cents", overrides: { amountBrlCents: 13000.5 } },
  ])("should reject a ledger entry with $description", async ({ description, overrides }) => {
    // Given
    const entry = { ...makeEntry(), ...overrides, dedupeKey: `invalid:${description}` } as NewLedgerEntry;

    // When
    const attempt = sut.insert({ entry });

    // Then
    await expect(attempt).rejects.toThrow(/CHECK constraint failed/);
  });

  it("should round-trip the migration down and up", async () => {
    // Given
    await sut.insert({ entry: makeEntry() });

    // When
    await down(knex);

    // Then
    await expect(knex("ledger_transactions").select("*")).rejects.toThrow();

    // When
    await up(knex);
    const stored = await sut.insert({ entry: makeEntry() });

    // Then
    expect(stored.amountBrlCents).toBe(13000);
    expect(await sut.getBalance()).toBe(13000);
  });
});
