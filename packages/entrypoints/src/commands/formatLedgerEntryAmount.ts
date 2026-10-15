import { LedgerTransaction, toDisplayBrl } from "@tf2qs/core";

type FormatLedgerEntryAmountParams = {
    entry: LedgerTransaction;
};

export function formatLedgerEntryAmount(params: FormatLedgerEntryAmountParams): string {
    const { entry } = params;
    if (entry.currencyOriginal === 'BRL') {
        return `R$ ${toDisplayBrl({ balanceBrlCents: entry.amountBrlCents })}`;
    }
    return `${entry.amountOriginal.toFixed(2)} USD (~R$ ${toDisplayBrl({ balanceBrlCents: entry.amountBrlCents })})`;
}
