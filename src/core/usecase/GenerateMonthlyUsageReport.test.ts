import { describe, expect, it, vi, beforeEach } from "vitest";
import { mock } from "vitest-mock-extended";
import { when } from "vitest-when";
import { ReportRepository } from "../repository/ReportRepository";
import { CostProvider } from "../services/CostProvider";
import { GenerateMonthlyUsageReport } from "./GenerateMonthlyUsageReport";
import { Region } from "../domain/Region";

vi.mock("../domain/Region", async () => {
  const actual = await vi.importActual("../domain/Region");
  return {
    ...actual,
    getRegions: vi.fn(() => [
      Region.SA_SAOPAULO_1,
      Region.US_CHICAGO_1,
    ]),
  };
});

describe("GenerateMonthlyUsageReport", () => {
  function makeSut() {
    const reportRepository = mock<ReportRepository>();
    const costProvider = mock<CostProvider>();
    const sut = new GenerateMonthlyUsageReport({ reportRepository, costProvider });

    return {
      sut,
      reportRepository,
      costProvider,
    };
  }

  it("should generate monthly usage report with all metrics", async () => {
    // Given
    const { sut, reportRepository, costProvider } = makeSut();

    const date = new Date("2025-10-15");

    const topUsers = [
      { userId: "user-1", totalTimePlayedMinutes: 3853 },
      { userId: "user-2", totalTimePlayedMinutes: 3171 },
    ];
    const regionMetrics = [
      { region: "sa-saopaulo-1", timePlayedMinutes: 26000 },
      { region: "us-chicago-1", timePlayedMinutes: 2139 },
    ];
    const peakConcurrentServers = { eventTime: 1234567890, maxServersRunning: 11 };
    const longestServerRun = {
      serverId: "server-123",
      createdBy: "user-1",
      createdAt: 1234567890000,
      terminatedAt: 1234601890000,
      durationMinutes: 567,
    };

    when(reportRepository.getTopUsersByMinutesPlayed)
      .calledWith({ month: 10, year: 2025, limit: 5 })
      .thenResolve(topUsers);

    when(reportRepository.getTotalServersCreated)
      .calledWith({ month: 10, year: 2025 })
      .thenResolve(790);

    when(reportRepository.getServerMinutesByRegion)
      .calledWith({ month: 10, year: 2025 })
      .thenResolve(regionMetrics);

    when(reportRepository.getAverageServerDuration)
      .calledWith({ month: 10, year: 2025 })
      .thenResolve(86.8);

    when(reportRepository.getTotalMinutesPlayed)
      .calledWith({ month: 10, year: 2025 })
      .thenResolve(68636);

    when(reportRepository.getPeakConcurrentServers)
      .calledWith({ month: 10, year: 2025 })
      .thenResolve(peakConcurrentServers);

    when(reportRepository.getLongestServerRun)
      .calledWith({ month: 10, year: 2025 })
      .thenResolve(longestServerRun);

    when(reportRepository.getUniqueUsersCount)
      .calledWith({ month: 10, year: 2025 })
      .thenResolve(100);

    when(costProvider.fetchCost)
      .calledWith({
        region: Region.SA_SAOPAULO_1,
        dateRange: { startDate: new Date(2025, 9, 1), endDate: new Date(2025, 9, 31) },
      })
      .thenResolve({ value: 150.5, currency: "USD" });

    when(costProvider.fetchCost)
      .calledWith({
        region: Region.US_CHICAGO_1,
        dateRange: { startDate: new Date(2025, 9, 1), endDate: new Date(2025, 9, 31) },
      })
      .thenResolve({ value: 200.75, currency: "USD" });

    // When
    const result = await sut.execute({ date });

    // Then
    expect(result).toBeDefined();
    expect(result.month).toBe(10);
    expect(result.year).toBe(2025);
    expect(result.topUsers).toEqual(topUsers);
    expect(result.totalServersCreated).toBe(790);
    expect(result.regionMetrics).toEqual(regionMetrics);
    expect(result.averageServerDurationMinutes).toBe(86.8);
    expect(result.totalTimePlayedMinutes).toBe(68636);
    expect(result.peakConcurrentServers).toEqual(peakConcurrentServers);
    expect(result.longestServerRun).toEqual(longestServerRun);
    expect(result.uniqueUsersCount).toBe(100);
    expect(result.regionCosts).toHaveLength(2);
    expect(result.regionCosts).toContainEqual({
      region: Region.SA_SAOPAULO_1,
      cost: 150.5,
      currency: "USD",
    });
    expect(result.regionCosts).toContainEqual({
      region: Region.US_CHICAGO_1,
      cost: 200.75,
      currency: "USD",
    });
  });

  it.each([
    { date: new Date("2025-10-15"), month: 10, year: 2025 },
    { date: new Date("2025-11-20"), month: 11, year: 2025 },
    { date: new Date("2025-12-01"), month: 12, year: 2025 },
  ])("should accept and use the provided date for report generation with date $date", async ({ date, month, year }) => {
    // Given
    const { sut, reportRepository, costProvider } = makeSut();

    when(reportRepository.getTopUsersByMinutesPlayed)
      .calledWith({ month, year, limit: 5 })
      .thenResolve([]);

    when(reportRepository.getTotalServersCreated)
      .calledWith({ month, year })
      .thenResolve(0);

    when(reportRepository.getServerMinutesByRegion)
      .calledWith({ month, year })
      .thenResolve([]);

    when(reportRepository.getAverageServerDuration)
      .calledWith({ month, year })
      .thenResolve(0);

    when(reportRepository.getTotalMinutesPlayed)
      .calledWith({ month, year })
      .thenResolve(0);

    when(reportRepository.getPeakConcurrentServers)
      .calledWith({ month, year })
      .thenResolve({ eventTime: 0, maxServersRunning: 0 });

    when(reportRepository.getLongestServerRun)
      .calledWith({ month, year })
      .thenResolve(null);

    when(reportRepository.getUniqueUsersCount)
      .calledWith({ month, year })
      .thenResolve(0);

    costProvider.fetchCost.mockResolvedValue({ value: 100, currency: "USD" });

    // When
    const result = await sut.execute({ date });

    // Then
    expect(result.month).toBe(month);
    expect(result.year).toBe(year);
    expect(reportRepository.getTopUsersByMinutesPlayed).toHaveBeenCalledWith({
      month,
      year,
      limit: 5,
    });
  });

  it("should handle no data for longest server run", async () => {
    // Given
    const { sut, reportRepository, costProvider } = makeSut();

    const date = new Date("2025-11-15");

    when(reportRepository.getTopUsersByMinutesPlayed)
      .calledWith({ month: 11, year: 2025, limit: 5 })
      .thenResolve([]);

    when(reportRepository.getTotalServersCreated)
      .calledWith({ month: 11, year: 2025 })
      .thenResolve(0);

    when(reportRepository.getServerMinutesByRegion)
      .calledWith({ month: 11, year: 2025 })
      .thenResolve([]);

    when(reportRepository.getAverageServerDuration)
      .calledWith({ month: 11, year: 2025 })
      .thenResolve(0);

    when(reportRepository.getTotalMinutesPlayed)
      .calledWith({ month: 11, year: 2025 })
      .thenResolve(0);

    when(reportRepository.getPeakConcurrentServers)
      .calledWith({ month: 11, year: 2025 })
      .thenResolve({ eventTime: 0, maxServersRunning: 0 });

    when(reportRepository.getLongestServerRun)
      .calledWith({ month: 11, year: 2025 })
      .thenResolve(null);

    when(reportRepository.getUniqueUsersCount)
      .calledWith({ month: 11, year: 2025 })
      .thenResolve(0);

    costProvider.fetchCost.mockResolvedValue({ value: 50, currency: "USD" });

    // When
    const result = await sut.execute({ date });

    // Then
    expect(result.longestServerRun).toEqual({
      serverId: "",
      createdBy: "",
      createdAt: 0,
      terminatedAt: 0,
      durationMinutes: 0,
    });
  });

  it("should call all repository methods exactly once", async () => {
    // Given
    const { sut, reportRepository, costProvider } = makeSut();

    const date = new Date("2025-09-10");

    when(reportRepository.getTopUsersByMinutesPlayed)
      .calledWith({ month: 9, year: 2025, limit: 5 })
      .thenResolve([]);

    when(reportRepository.getTotalServersCreated)
      .calledWith({ month: 9, year: 2025 })
      .thenResolve(0);

    when(reportRepository.getServerMinutesByRegion)
      .calledWith({ month: 9, year: 2025 })
      .thenResolve([]);

    when(reportRepository.getAverageServerDuration)
      .calledWith({ month: 9, year: 2025 })
      .thenResolve(0);

    when(reportRepository.getTotalMinutesPlayed)
      .calledWith({ month: 9, year: 2025 })
      .thenResolve(0);

    when(reportRepository.getPeakConcurrentServers)
      .calledWith({ month: 9, year: 2025 })
      .thenResolve({ eventTime: 0, maxServersRunning: 0 });

    when(reportRepository.getLongestServerRun)
      .calledWith({ month: 9, year: 2025 })
      .thenResolve(null);

    when(reportRepository.getUniqueUsersCount)
      .calledWith({ month: 9, year: 2025 })
      .thenResolve(0);

    costProvider.fetchCost.mockResolvedValue({ value: 75, currency: "USD" });

    // When
    await sut.execute({ date });

    // Then
    expect(reportRepository.getTopUsersByMinutesPlayed).toHaveBeenCalledTimes(1);
    expect(reportRepository.getTotalServersCreated).toHaveBeenCalledTimes(1);
    expect(reportRepository.getServerMinutesByRegion).toHaveBeenCalledTimes(1);
    expect(reportRepository.getAverageServerDuration).toHaveBeenCalledTimes(1);
    expect(reportRepository.getTotalMinutesPlayed).toHaveBeenCalledTimes(1);
    expect(reportRepository.getPeakConcurrentServers).toHaveBeenCalledTimes(1);
    expect(reportRepository.getLongestServerRun).toHaveBeenCalledTimes(1);
    expect(reportRepository.getUniqueUsersCount).toHaveBeenCalledTimes(1);
    expect(costProvider.fetchCost).toHaveBeenCalledTimes(2);
  });
});
