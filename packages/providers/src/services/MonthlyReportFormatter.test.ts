import { MonthlyUsageReport, getMoneyConfig, toMajorUnits } from "@tf2qs/core";
import { describe, expect, it } from "vitest";
import { MonthlyReportFormatter } from "./MonthlyReportFormatter";

const REGION_COST = 100;
const SUPPORT_CHANNEL_ID = "1365408843676520508";

const { fixedMonthlyInfrastructureCost } = getMoneyConfig();
const expectedBotInfrastructureCost = toMajorUnits({
  amountInMinorUnits: fixedMonthlyInfrastructureCost.amountInMinorUnits,
}).toFixed(2);
const expectedBotInfrastructureCurrency = fixedMonthlyInfrastructureCost.currency;
const expectedBotInfrastructureTotal = (REGION_COST + Number(expectedBotInfrastructureCost)).toFixed(2);

describe("MonthlyReportFormatter", () => {
  const makeSut = () => new MonthlyReportFormatter();

  const makeReport = (overrides: Partial<MonthlyUsageReport> = {}): MonthlyUsageReport => ({
    averageServerDurationMinutes: 120,
    month: 10,
    peakConcurrentServers: { eventTime: 1, maxServersRunning: 10 },
    regionCosts: [{ region: "sa-santiago-1", cost: REGION_COST, currency: expectedBotInfrastructureCurrency }],
    longestServerRun: { createdAt: 0, createdBy: "user", serverId: "server1", terminatedAt: 1000, durationMinutes: 160 },
    regionMetrics: [{ region: "sa-santiago-1", timePlayedMinutes: 500 }],
    totalServersCreated: 50,
    totalTimePlayedMinutes: 10000,
    topUsers: [{ userId: "user1", totalTimePlayedMinutes: 3000 }],
    year: 2025,
    uniqueUsersCount: 25,
    ...overrides,
  });

  it("should render the configured bot infrastructure cost in the totals", () => {
    // Given
    const sut = makeSut();
    const report = makeReport();

    // When
    const formatted = sut.format(report);

    // Then
    expect(formatted).toContain(
      `🤖 Bot Infrastructure: **$${expectedBotInfrastructureCost} ${expectedBotInfrastructureCurrency}**`
    );
    expect(formatted).toContain(
      `**💰 Total:** **${expectedBotInfrastructureCurrency}:** **$${expectedBotInfrastructureTotal} ${expectedBotInfrastructureCurrency}**`
    );
  });

  it("should render the region cost lines", () => {
    // Given
    const sut = makeSut();
    const report = makeReport();

    // When
    const formatted = sut.format(report);

    // Then
    expect(formatted).toContain(`* 🇨🇱 Santiago: **${REGION_COST.toFixed(2)} ${expectedBotInfrastructureCurrency}**`);
    expect(formatted).toContain("* 🇦🇷 Buenos Aires: **$0.00**");
  });

  it("should default a region missing from the report to $0.00", () => {
    // Given
    const sut = makeSut();
    const report = makeReport({ regionCosts: [] });

    // When
    const formatted = sut.format(report);

    // Then
    expect(formatted).toContain("* 🇨🇱 Santiago: **$0.00**");
    expect(formatted).toContain("* 🇦🇷 Buenos Aires: **$0.00**");
    expect(formatted).toContain("* 🇦🇺 Sydney: **$0.00**");
  });

  it("should render the support line only when a support channel id is given", () => {
    // Given
    const sut = makeSut();
    const report = makeReport();

    // When
    const withSupport = sut.format(report, { supportChannelId: SUPPORT_CHANNEL_ID });
    const withoutSupport = sut.format(report);

    // Then
    expect(withSupport).toContain(`See <#${SUPPORT_CHANNEL_ID}> to help!`);
    expect(withoutSupport).not.toContain("See <#");
  });
});
