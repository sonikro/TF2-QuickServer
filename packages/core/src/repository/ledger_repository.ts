import { LedgerTransaction, NewLedgerEntry } from "../domain/ledger_transaction";

export interface LedgerRepository {
  insert(params: { entry: NewLedgerEntry }): Promise<LedgerTransaction>;
  existsByDedupeKey(params: { dedupeKey: string }): Promise<boolean>;
  getBalance(): Promise<number>;
  listRecent(params: { limit: number }): Promise<LedgerTransaction[]>;
}
