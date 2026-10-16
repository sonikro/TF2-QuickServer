import { Region, getRegions } from "../domain/Region";
import { LedgerCurrency, buildCostDedupeKey, buildSettlementOccurredAt, toMajorUnits } from "../domain/LedgerTransaction";
import { MoneyConfig } from "../domain/MoneyConfig";
import { CostProvider } from "../services/CostProvider";
import { EventLogger } from "../services/EventLogger";
import { ExchangeRateProvider } from "../services/ExchangeRateProvider";
import { UserError } from "../errors/UserError";
import { RegisterCost } from "./RegisterCost";

type MonthlyCostSettlementDependencies = {
  costProvider: CostProvider;
  exchangeRateProvider: ExchangeRateProvider;
  registerCost: RegisterCost;
  moneyConfig: MoneyConfig;
  eventLogger?: EventLogger;
};

type MonthlyCostSettlementExecuteParams = {
  month: number;
  year: number;
};

type MonthlyCostSettlementResult = {
  inserted: number;
  skipped: number;
  failed: number;
};

export class MonthlyCostSettlement {
  constructor(private readonly dependencies: MonthlyCostSettlementDependencies) {}

  async execute(params: MonthlyCostSettlementExecuteParams): Promise<MonthlyCostSettlementResult> {
    const { costProvider, exchangeRateProvider, registerCost, moneyConfig } = this.dependencies;
    const { month, year } = params;

    validateSettlement({ month });

    const occurredAt = buildSettlementOccurredAt({ month, year });
    const dateRange = {
      startDate: new Date(Date.UTC(year, month - 1, 1)),
      endDate: new Date(Date.UTC(year, month, 0)),
    };
    const fx = await exchangeRateProvider.getBrlPerUsd({ date: occurredAt });

    const segments = [
      ...getRegions().map((region) => ({ segment: region as string, region })),
      ...[{ segment: 'bot-infra', region: null }],
    ];

    let inserted = 0;
    let skipped = 0;
    let failed = 0;

    for (const { segment, region } of segments) {
      try {
        const settled = await settleSegment({ segment, region, costProvider, registerCost, moneyConfig, fxRate: fx.rate, month, year, occurredAt, dateRange });
        if (settled) {
          inserted += 1;
        } else {
          skipped += 1;
        }
      } catch (error) {
        failed += 1;
        await this.dependencies.eventLogger?.log({
          eventMessage: `Monthly cost settlement failed for ${year}-${String(month).padStart(2, '0')} ${segment}: ${error instanceof Error ? error.message : String(error)}`,
          actorId: 'system',
        });
      }
    }

    return { inserted, skipped, failed };
  }
}

type SettleSegmentParams = {
  segment: string;
  region: Region | null;
  costProvider: CostProvider;
  registerCost: RegisterCost;
  moneyConfig: MoneyConfig;
  fxRate: number;
  month: number;
  year: number;
  occurredAt: Date;
  dateRange: { startDate: Date; endDate: Date };
};

async function settleSegment(params: SettleSegmentParams): Promise<boolean> {
  const { segment, region, costProvider, registerCost, moneyConfig, fxRate, month, year, occurredAt, dateRange } = params;
  const { fixedMonthlyInfrastructureCost } = moneyConfig;
  const cost = region
    ? await costProvider.fetchCost({ region, dateRange })
    : {
        currency: fixedMonthlyInfrastructureCost.currency,
        value: toMajorUnits({ amountInMinorUnits: fixedMonthlyInfrastructureCost.amountInMinorUnits }),
      };
  if (cost.value <= 0) {
    return false;
  }
  const currency = cost.currency as LedgerCurrency;
  const settled = await registerCost.execute({
    amount: cost.value,
    currency,
    source: `Monthly infrastructure cost ${year}-${String(month).padStart(2, '0')} ${segment}`,
    dedupeKey: buildCostDedupeKey({ month, year, segment }),
    occurredAt,
    fxRate: currency === 'BRL' ? 1 : fxRate,
    fxSource: currency === 'BRL' ? 'NONE' : 'PTAX',
  });
  return settled !== null;
}

type ValidateSettlementParams = {
  month: number;
};

function validateSettlement(params: ValidateSettlementParams): void {
  const { month } = params;
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new UserError('Settlement month must be an integer between 1 and 12.');
  }
}
