export interface ExchangeRateProvider {
  getBrlPerUsd(params: { date: Date }): Promise<{ rate: number; source: 'PTAX'; quotedAt: Date }>;
}
