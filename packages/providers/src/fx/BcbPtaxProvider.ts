import { ExchangeRateProvider } from "@tf2qs/core";

type BcbPtaxProviderDependencies = {
  fetchFn?: typeof fetch;
  cacheTtlMs?: number;
};

type CachedQuote = {
  rate: number;
  quotedAt: Date;
  expiresAt: number;
};

const PTAX_BASE_URL = 'https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata';
const MAX_LOOKUP_DAYS = 7;
const DEFAULT_CACHE_TTL_MS = 60 * 60 * 1000;

export class BcbPtaxProvider implements ExchangeRateProvider {
  private readonly cache = new Map<string, CachedQuote>();

  constructor(private readonly dependencies: BcbPtaxProviderDependencies = {}) {}

  async getBrlPerUsd(params: { date: Date }): Promise<{ rate: number; source: 'PTAX'; quotedAt: Date }> {
    const { date } = params;
    const cacheKey = toIsoDay({ date });
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return { rate: cached.rate, source: 'PTAX', quotedAt: cached.quotedAt };
    }

    const quote = await this.fetchRecentQuote({ date });

    const ttlMs = this.dependencies.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS;
    this.cache.set(cacheKey, { rate: quote.rate, quotedAt: quote.quotedAt, expiresAt: Date.now() + ttlMs });

    return { rate: quote.rate, source: 'PTAX', quotedAt: quote.quotedAt };
  }

  private async fetchRecentQuote(params: { date: Date }): Promise<{ rate: number; quotedAt: Date }> {
    const { date } = params;
    const fetchFn = this.dependencies.fetchFn ?? fetch;

    for (let daysBack = 0; daysBack < MAX_LOOKUP_DAYS; daysBack += 1) {
      const candidate = stepBackDays({ date, daysBack });
      const response = await fetchFn(buildQuoteUrl({ date: candidate }), { signal: AbortSignal.timeout(20000) });
      if (!response.ok) {
        throw new Error(`BCB PTAX request failed with status ${response.status}`);
      }
      const quote = extractQuote({ body: await readJson({ response }) });
      if (quote) {
        return quote;
      }
    }

    throw new Error('BCB PTAX has no USD quote for the last 7 days');
  }
}

type DateParams = {
  date: Date;
};

function toIsoDay(params: DateParams): string {
  const { date } = params;
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

function toPtaxDay(params: DateParams): string {
  const { date } = params;
  return `${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}-${date.getUTCFullYear()}`;
}

function stepBackDays(params: DateParams & { daysBack: number }): Date {
  const { date, daysBack } = params;
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() - daysBack));
}

function buildQuoteUrl(params: DateParams): string {
  const { date } = params;
  return `${PTAX_BASE_URL}/CotacaoDolarDia(dataCotacao=@dataCotacao)` +
    `?@dataCotacao='${toPtaxDay({ date })}'&$format=json&$select=cotacaoVenda,dataHoraCotacao`;
}

type ReadJsonParams = {
  response: Response;
};

async function readJson(params: ReadJsonParams): Promise<unknown> {
  const { response } = params;
  try {
    return await response.json();
  } catch {
    throw new Error('BCB PTAX response is not valid JSON');
  }
}

type ExtractQuoteParams = {
  body: unknown;
};

function extractQuote(params: ExtractQuoteParams): { rate: number; quotedAt: Date } | null {
  const { body } = params;
  const values = (body as { value?: unknown })?.value;
  if (!Array.isArray(values) || values.length === 0) {
    return null;
  }
  const first = values[0] as { cotacaoVenda?: unknown; dataHoraCotacao?: unknown };
  if (typeof first.cotacaoVenda !== 'number' || !Number.isFinite(first.cotacaoVenda)) {
    throw new Error('BCB PTAX response is missing cotacaoVenda');
  }
  return {
    rate: first.cotacaoVenda,
    quotedAt: typeof first.dataHoraCotacao === 'string' ? new Date(first.dataHoraCotacao) : new Date(),
  };
}
