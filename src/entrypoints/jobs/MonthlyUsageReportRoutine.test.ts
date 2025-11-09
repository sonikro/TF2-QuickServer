import { describe, expect, it, vi } from "vitest";
import { scheduleMonthlyUsageReportRoutine, ScheduleMonthlyUsageReportRoutineDependencies } from "./MonthlyUsageReportRoutine";
import schedule from "node-schedule";
import { mock } from "vitest-mock-extended";
import { ConfigManager } from "../../core/utils/ConfigManager";
import { Client } from "discord.js";
import { EventLogger } from "../../core/services/EventLogger";
import { GenerateMonthlyUsageReport } from "../../core/usecase/GenerateMonthlyUsageReport";

vi.mock("node-schedule")

describe("MonthlyUsageReportRoutine", () => {

    const makeSut = () => {
        const scheduleMock = vi.mocked(schedule)

        const channelGetFn = vi.fn();
        const dependencies = {
            configManager: mock<ConfigManager>(),
            discordClient: mock<Client>({
                channels: mock({
                    cache: {
                        get: channelGetFn
                    }
                }) as any
            }),
            eventLogger: mock<EventLogger>(),
            generateMonthlyUsageReport: mock<GenerateMonthlyUsageReport>(),
        }

        return {
            sut: scheduleMonthlyUsageReportRoutine,
            scheduleMock,
            dependencies,
            channelGetFn,
        }
    }

    describe("Scheduling", () => {

        it("should schedule the job to run monthly at the first day of the month at 15:00", () => {
            // Given
            const { sut, scheduleMock, dependencies } = makeSut();

            // When
            sut(dependencies);

            // Then
            expect(scheduleMock.scheduleJob).toHaveBeenCalledWith("0 15 1 * *", expect.any(Function));
        })

    })

    describe("Job Execution", () => {
        // Given
        const { sut, dependencies, scheduleMock, channelGetFn } = makeSut();
        const now = new Date("2025-11-15T10:00:00Z"); // Fixed current date to Nov 15, 2025
        vi.setSystemTime(now);

        const reportChannelId = "test-channel-id";
        dependencies.configManager.getDiscordConfig.mockReturnValue({
            reportDiscordChannelId: reportChannelId,
            logChannelId: "log-channel-id",
        });

        const sendFn = vi.fn();
        channelGetFn.mockReturnValue({
            type: 0, // GuildText
            send: sendFn,
        });

        dependencies.generateMonthlyUsageReport.execute.mockResolvedValue({
            averageServerDurationMinutes: 120,
            month: 10,
            peakConcurrentServers: { eventTime: 1, maxServersRunning: 10 },
            regionCosts: [{ region: "sa-santiago-1", cost: 100, currency: "USD" }],
            longestServerRun: { createdAt: 0, createdBy: "user", serverId: "server1", terminatedAt: 1000, durationMinutes: 160 },
            regionMetrics: [{ region: "sa-santiago-1", timePlayedMinutes: 500 }],
            totalServersCreated: 50,
            totalTimePlayedMinutes: 10000,
            topUsers: [{ userId: "user1", totalTimePlayedMinutes: 3000 }],
            year: 2025,
            uniqueUsersCount: 25,
        })
        // When

        sut(dependencies);

        const scheduledJobCallback = scheduleMock.scheduleJob.mock.calls[0][1];
        scheduledJobCallback(now);

        // Then

        it("should call generateMonthlyUsageReport.execute with the previous month's date", () => {
            expect(dependencies.generateMonthlyUsageReport.execute).toHaveBeenCalledWith({
                date: new Date(2025, 9, 1) // October 1, 2025
            })
        })

        it("should send the report to the configured Discord channel", async () => {
            expect(channelGetFn).toHaveBeenCalledWith(reportChannelId);
            expect(sendFn).toHaveBeenCalledWith(`@everyone
📊 **TF2-QuickServer | October 2025 Metrics & Costs**
---
💸 **Usage Costs**
* 🇦🇷 Buenos Aires: **$0.00**
* 🇧🇷 São Paulo: **$0.00**
* 🇨🇱 Santiago: **100.00 USD**
* 🇩🇪 Frankfurt: **$0.00**
* 🇺🇸 Chicago: **$0.00**
* 🇵🇪 Lima: **$0.00**
* 🇦🇺 Sydney: **$0.00**
🤖 Bot Infrastructure: **$5.05 USD**
**💰 Total:** **USD:** **$105.05 USD**
---
🏆 **Top 5 Users**
* 🥇 <@user1> — **3000 min** *(50.0 hrs)*
---
🌍 **Server Minutes by Region**
* 🇨🇱 Santiago: **500 min**
---
📈 **General Stats**
* 🕒 **Total minutes:** **10,000 min** *(166.7 hrs)*
* 🚀 **Max concurrent servers:** **10**
* 🖥️ **Servers created:** **50**
* 👥 **Unique users:** **25**
See <#1365408843676520508> to help!`);
        })
    })
})