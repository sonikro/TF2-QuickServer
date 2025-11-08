import { describe, expect, it } from "vitest";
import { MonthlyReportFormatter } from "./MonthlyReportFormatter";
import { MonthlyUsageReport } from "../../core/domain/MonthlyUsageReport";

describe("MonthlyReportFormatter", () => {
  function makeSut() {
    const sut = new MonthlyReportFormatter();
    return { sut };
  }

  it("should format report with all metrics populated", () => {
    // Given
    const { sut } = makeSut();
    const report: MonthlyUsageReport = {
      month: 10,
      year: 2025,
      topUsers: [
        { userId: "user-1", totalTimePlayedMinutes: 3853 },
        { userId: "user-2", totalTimePlayedMinutes: 3171 },
        { userId: "user-3", totalTimePlayedMinutes: 3063 },
      ],
      totalServersCreated: 790,
      regionMetrics: [
        { region: "sa-saopaulo-1", timePlayedMinutes: 26000 },
        { region: "us-chicago-1", timePlayedMinutes: 2139 },
      ],
      averageServerDurationMinutes: 86.8,
      totalTimePlayedMinutes: 68636,
      peakConcurrentServers: { eventTime: 1234567890, maxServersRunning: 11 },
      longestServerRun: {
        serverId: "server-123",
        createdBy: "user-1",
        createdAt: 1234567890000,
        terminatedAt: 1234601890000,
        durationMinutes: 567,
      },
      uniqueUsersCount: 100,
    };

    // When
    const result = sut.format(report);

    // Then
    expect(result).toContain("@everyone");
    expect(result).toContain("📊 **TF2-QuickServer | October 2025 Metrics & Costs**");
    expect(result).toContain("🥇 @user-1 — 3853 min (64.2 hrs)");
    expect(result).toContain("🥈 @user-2 — 3171 min (52.9 hrs)");
    expect(result).toContain("🥉 @user-3 — 3063 min (51.0 hrs)");
    expect(result).toContain("🖥️ Servers created: 790");
    expect(result).toContain("👥 Unique users: 100");
    expect(result).toContain("🇧🇷 São Paulo: 26000 min");
    expect(result).toContain("🇺🇸 Chicago: 2139 min");
  });

  it("should include month and year in header", () => {
    // Given
    const { sut } = makeSut();
    const report: MonthlyUsageReport = {
      month: 12,
      year: 2024,
      topUsers: [],
      totalServersCreated: 0,
      regionMetrics: [],
      averageServerDurationMinutes: 0,
      totalTimePlayedMinutes: 0,
      peakConcurrentServers: { eventTime: 0, maxServersRunning: 0 },
      longestServerRun: {
        serverId: "",
        createdBy: "",
        createdAt: 0,
        terminatedAt: 0,
        durationMinutes: 0,
      },
      uniqueUsersCount: 0,
    };

    // When
    const result = sut.format(report);

    // Then
    expect(result).toContain("December 2024");
  });

  it("should display TBD for cost section", () => {
    // Given
    const { sut } = makeSut();
    const report: MonthlyUsageReport = {
      month: 1,
      year: 2025,
      topUsers: [],
      totalServersCreated: 0,
      regionMetrics: [],
      averageServerDurationMinutes: 0,
      totalTimePlayedMinutes: 0,
      peakConcurrentServers: { eventTime: 0, maxServersRunning: 0 },
      longestServerRun: {
        serverId: "",
        createdBy: "",
        createdAt: 0,
        terminatedAt: 0,
        durationMinutes: 0,
      },
      uniqueUsersCount: 0,
    };

    // When
    const result = sut.format(report);

    // Then
    expect(result).toContain("Buenos Aires: TBD");
    expect(result).toContain("São Paulo: TBD");
    expect(result).toContain("$5.05 USD");
    expect(result).toContain("💰 Total: TBD");
  });

  it("should calculate hours correctly from minutes", () => {
    // Given
    const { sut } = makeSut();
    const report: MonthlyUsageReport = {
      month: 3,
      year: 2025,
      topUsers: [{ userId: "player", totalTimePlayedMinutes: 360 }],
      totalServersCreated: 5,
      regionMetrics: [],
      averageServerDurationMinutes: 120.5,
      totalTimePlayedMinutes: 1440,
      peakConcurrentServers: { eventTime: 0, maxServersRunning: 8 },
      longestServerRun: {
        serverId: "",
        createdBy: "",
        createdAt: 0,
        terminatedAt: 0,
        durationMinutes: 0,
      },
      uniqueUsersCount: 10,
    };

    // When
    const result = sut.format(report);

    // Then
    expect(result).toContain("360 min (6.0 hrs)");
    expect(result).toContain("1440 min (24.0 hrs)");
    expect(result).toContain("⏱️ Average server duration: 120.5 minutes");
  });

  it("should handle empty top users gracefully", () => {
    // Given
    const { sut } = makeSut();
    const report: MonthlyUsageReport = {
      month: 5,
      year: 2025,
      topUsers: [],
      totalServersCreated: 10,
      regionMetrics: [],
      averageServerDurationMinutes: 50,
      totalTimePlayedMinutes: 500,
      peakConcurrentServers: { eventTime: 0, maxServersRunning: 3 },
      longestServerRun: {
        serverId: "",
        createdBy: "",
        createdAt: 0,
        terminatedAt: 0,
        durationMinutes: 0,
      },
      uniqueUsersCount: 0,
    };

    // When
    const result = sut.format(report);

    // Then
    expect(result).toContain("🏆 Top 5 Users");
    expect(result).toContain("No data available");
  });

  it("should handle empty region metrics gracefully", () => {
    // Given
    const { sut } = makeSut();
    const report: MonthlyUsageReport = {
      month: 7,
      year: 2025,
      topUsers: [],
      totalServersCreated: 0,
      regionMetrics: [],
      averageServerDurationMinutes: 0,
      totalTimePlayedMinutes: 0,
      peakConcurrentServers: { eventTime: 0, maxServersRunning: 0 },
      longestServerRun: {
        serverId: "",
        createdBy: "",
        createdAt: 0,
        terminatedAt: 0,
        durationMinutes: 0,
      },
      uniqueUsersCount: 0,
    };

    // When
    const result = sut.format(report);

    // Then
    expect(result).toContain("🌍 Server Minutes by Region");
    expect(result).toContain("No data available");
  });

  it("should include emoji for each region", () => {
    // Given
    const { sut } = makeSut();
    const report: MonthlyUsageReport = {
      month: 9,
      year: 2025,
      topUsers: [],
      totalServersCreated: 0,
      regionMetrics: [
        { region: "sa-saopaulo-1", timePlayedMinutes: 1000 },
        { region: "eu-frankfurt-1", timePlayedMinutes: 500 },
        { region: "us-east-1-bue-1a", timePlayedMinutes: 250 },
      ],
      averageServerDurationMinutes: 0,
      totalTimePlayedMinutes: 0,
      peakConcurrentServers: { eventTime: 0, maxServersRunning: 0 },
      longestServerRun: {
        serverId: "",
        createdBy: "",
        createdAt: 0,
        terminatedAt: 0,
        durationMinutes: 0,
      },
      uniqueUsersCount: 0,
    };

    // When
    const result = sut.format(report);

    // Then
    expect(result).toContain("🇧🇷 São Paulo");
    expect(result).toContain("🇩🇪 Frankfurt");
    expect(result).toContain("🇦🇷 Buenos Aires");
  });

  it("should display correct medal ranking", () => {
    // Given
    const { sut } = makeSut();
    const report: MonthlyUsageReport = {
      month: 11,
      year: 2025,
      topUsers: [
        { userId: "first", totalTimePlayedMinutes: 1000 },
        { userId: "second", totalTimePlayedMinutes: 900 },
        { userId: "third", totalTimePlayedMinutes: 800 },
        { userId: "fourth", totalTimePlayedMinutes: 700 },
        { userId: "fifth", totalTimePlayedMinutes: 600 },
      ],
      totalServersCreated: 0,
      regionMetrics: [],
      averageServerDurationMinutes: 0,
      totalTimePlayedMinutes: 0,
      peakConcurrentServers: { eventTime: 0, maxServersRunning: 0 },
      longestServerRun: {
        serverId: "",
        createdBy: "",
        createdAt: 0,
        terminatedAt: 0,
        durationMinutes: 0,
      },
      uniqueUsersCount: 0,
    };

    // When
    const result = sut.format(report);

    // Then
    expect(result).toContain("🥇 @first");
    expect(result).toContain("🥈 @second");
    expect(result).toContain("🥉 @third");
    expect(result).toContain("🏅 @fourth");
    expect(result).toContain("🏅 @fifth");
  });
});
