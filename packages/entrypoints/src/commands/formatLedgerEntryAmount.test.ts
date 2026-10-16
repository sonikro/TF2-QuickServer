import { LedgerTransaction } from "@tf2qs/core";
import { describe, expect, it } from "vitest";
import { formatLedgerEntryAmount } from "./formatLedgerEntryAmount";

describe("formatLedgerEntryAmount", () => {
    const makeEntry = (overrides: Partial<LedgerTransaction> = {}): LedgerTransaction => ({
        id: 1,
        occurredAt: new Date('2026-10-06T12:00:00.000Z'),
        type: 'DONATION',
        amountOriginal: 130,
        currencyOriginal: 'BRL',
        amountBrlCents: 13000,
        fxRate: 1,
        fxSource: 'NONE',
        source: 'Monthly support',
        actorDiscordId: 'owner-id',
        dedupeKey: 'donation:seed',
        createdAt: new Date('2026-10-06T12:00:01.000Z'),
        ...overrides,
    });

    it("should render a BRL entry with the real symbol", () => {
        // Given
        const entry = makeEntry();

        // When
        const formatted = formatLedgerEntryAmount({ entry });

        // Then
        expect(formatted).toBe("R$ 130.00");
    });

    it("should render a USD entry with the converted real amount", () => {
        // Given
        const entry = makeEntry({
            amountOriginal: 10,
            currencyOriginal: 'USD',
            amountBrlCents: 5500,
            fxRate: 5.5,
            fxSource: 'PTAX',
        });

        // When
        const formatted = formatLedgerEntryAmount({ entry });

        // Then
        expect(formatted).toBe("10.00 USD (~R$ 55.00)");
    });

    it("should render a negative cost entry in reais", () => {
        // Given
        const entry = makeEntry({ type: 'COST', amountOriginal: 5.05, currencyOriginal: 'BRL', amountBrlCents: -505 });

        // When
        const formatted = formatLedgerEntryAmount({ entry });

        // Then
        expect(formatted).toBe("R$ -5.05");
    });
});
