import { LedgerTransaction, NewLedgerEntry } from "../domain/LedgerTransaction";

export interface LedgerRepository {
  insert(params: { entry: NewLedgerEntry }): Promise<LedgerTransaction>;
  existsByDedupeKey(params: { dedupeKey: string }): Promise<boolean>;
  hasTransactions(): Promise<boolean>;
  getBalance(): Promise<number>;
  listRecent(params: { limit: number }): Promise<LedgerTransaction[]>;
}
