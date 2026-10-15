import { Client } from "discord.js";
import schedule from "node-schedule";
import { describe, expect, it, vi } from "vitest";
import { mock } from "vitest-mock-extended";
import { EventLogger } from "@tf2qs/core";
import { GenerateMonthlyUsageReport } from "@tf2qs/core";
import { ConfigManager } from "@tf2qs/core";
import { GetBalance } from "@tf2qs/core";
import { MonthlyCostSettlement } from "@tf2qs/core";
import { scheduleMonthlyUsageReportRoutine } from "./MonthlyUsageReportRoutine";

vi.mock("node-schedule")

describe("MonthlyUsageReportRoutine", () => {

    const makeSut = () => {
        const scheduleMock = vi.mocked(schedule)

        const channelGetFn = vi.fn();
        const channelFetchFn = vi.fn();
        const dependencies = {
            configManager: mock<ConfigManager>(),
            discordClient: mock<Client>({
                channels: mock({
                    cache: {
                        get: channelGetFn
                    },
                    fetch: channelFetchFn
                }) as any
            }),
            eventLogger: mock<EventLogger>(),
            generateMonthlyUsageReport: mock<GenerateMonthlyUsageReport>(),
            monthlyCostSettlement: mock<MonthlyCostSettlement>(),
            getBalance: mock<GetBalance>(),
        }

        return {
            sut: scheduleMonthlyUsageReportRoutine,
            scheduleMock,
            dependencies,
            channelGetFn,
            channelFetchFn,
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
        const { sut, dependencies, scheduleMock, channelGetFn, channelFetchFn } = makeSut();
        const now = new Date("2025-11-15T10:00:00Z"); // Fixed current date to Nov 15, 2025
        vi.setSystemTime(now);

        const reportChannelId = "test-channel-id";
        const moneyChannelId = "money-channel-id";
        dependencies.configManager.getDiscordConfig.mockReturnValue({
            reportDiscordChannelId: reportChannelId,
            logChannelId: "log-channel-id",
            streamerChannelId: "streamer-channel-id",
            supportChannelId: "1365408843676520508",
            moneyChannelId,
            moneyOwnerDiscordIds: ["owner-id"],
        } as any);

        const sendFn = vi.fn();
        const moneySendFn = vi.fn();
        channelGetFn.mockReturnValue({
            type: 0, // GuildText
            send: sendFn,
        });
        channelFetchFn.mockImplementation((channelId: string) => {
            if (channelId === moneyChannelId) {
                return { type: 0, send: moneySendFn };
            }
            return undefined;
        });

        dependencies.monthlyCostSettlement.execute.mockResolvedValue({ inserted: 9, skipped: 0, failed: 0 });
        dependencies.getBalance.execute.mockResolvedValue({ balanceBrlCents: 12345 });

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
        const jobPromise = scheduledJobCallback(now);

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
* 🇨🇴 Bogotá: **$0.00**
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

        it("should settle costs for the reported month and year", async () => {
            await jobPromise;
            expect(dependencies.monthlyCostSettlement.execute).toHaveBeenCalledWith({ month: 10, year: 2025 });
        })

        it("should post the cost and balance summary to the money channel", async () => {
            await jobPromise;
            expect(channelFetchFn).toHaveBeenCalledWith(moneyChannelId);
            expect(moneySendFn).toHaveBeenCalledWith(expect.stringContaining("costs for 10/2025 settled"));
            expect(moneySendFn).toHaveBeenCalledWith(expect.stringContaining("New cost entries: 9"));
            expect(moneySendFn).toHaveBeenCalledWith(expect.stringContaining("Already recorded: 0"));
            expect(moneySendFn).toHaveBeenCalledWith(expect.stringContaining("Failed: 0"));
            expect(moneySendFn).toHaveBeenCalledWith(expect.stringContaining("R$ 123.45"));
        })
    })

    describe("Money Settlement Failures", () => {
        const makeReport = () => ({
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
        });

        const makeFailureSut = () => {
            const { sut, scheduleMock, dependencies, channelGetFn, channelFetchFn } = makeSut();
            const now = new Date("2025-11-15T10:00:00Z");
            vi.setSystemTime(now);
            dependencies.configManager.getDiscordConfig.mockReturnValue({
                reportDiscordChannelId: "test-channel-id",
                logChannelId: "log-channel-id",
                streamerChannelId: "streamer-channel-id",
                supportChannelId: "1365408843676520508",
                moneyChannelId: "money-channel-id",
                moneyOwnerDiscordIds: ["owner-id"],
            } as any);
            const sendFn = vi.fn();
            const moneySendFn = vi.fn();
            channelGetFn.mockReturnValue({ type: 0, send: sendFn });
            channelFetchFn.mockImplementation((channelId: string) =>
                channelId === "money-channel-id" ? { type: 0, send: moneySendFn } : undefined
            );
            dependencies.generateMonthlyUsageReport.execute.mockResolvedValue(makeReport() as any);
            return { sut, scheduleMock, dependencies, channelGetFn, channelFetchFn, sendFn, moneySendFn, now };
        }

        const runJob = async (sut: ReturnType<typeof makeSut>["sut"], dependencies: any, scheduleMock: any, now: Date) => {
            sut(dependencies);
            const scheduledJobCallback = scheduleMock.scheduleJob.mock.calls[scheduleMock.scheduleJob.mock.calls.length - 1][1];
            await scheduledJobCallback(now);
        }

        it("should still deliver the report when settlement fails", async () => {
            // Given
            const { sut, scheduleMock, dependencies, sendFn, now } = makeFailureSut();
            dependencies.monthlyCostSettlement.execute.mockRejectedValue(new Error("PTAX down"));
            dependencies.getBalance.execute.mockResolvedValue({ balanceBrlCents: 0 });

            // When
            await runJob(sut, dependencies, scheduleMock, now);

            // Then
            expect(sendFn).toHaveBeenCalled();
            expect(dependencies.eventLogger.log).toHaveBeenCalledWith(expect.objectContaining({
                eventMessage: expect.stringContaining("Error during monthly cost settlement"),
            }));
        })

        it("should report the failed segments in the money summary", async () => {
            // Given
            const { sut, scheduleMock, dependencies, moneySendFn, now } = makeFailureSut();
            dependencies.monthlyCostSettlement.execute.mockResolvedValue({ inserted: 8, skipped: 0, failed: 1 });
            dependencies.getBalance.execute.mockResolvedValue({ balanceBrlCents: 12345 });

            // When
            await runJob(sut, dependencies, scheduleMock, now);

            // Then
            expect(moneySendFn).toHaveBeenCalledWith(expect.stringContaining("costs for 10/2025 settled"));
            expect(moneySendFn).toHaveBeenCalledWith(expect.stringContaining("New cost entries: 8"));
            expect(moneySendFn).toHaveBeenCalledWith(expect.stringContaining("Already recorded: 0"));
            expect(moneySendFn).toHaveBeenCalledWith(expect.stringContaining("Failed: 1"));
            expect(moneySendFn).toHaveBeenCalledWith(expect.stringContaining("R$ 123.45"));
        })

        it("should still deliver the report when the money channel is missing", async () => {
            // Given
            const { sut, scheduleMock, dependencies, channelFetchFn, sendFn, moneySendFn, now } = makeFailureSut();
            channelFetchFn.mockImplementation((channelId: string) =>
                channelId === "money-channel-id" ? undefined : { type: 0, send: sendFn }
            );
            dependencies.monthlyCostSettlement.execute.mockResolvedValue({ inserted: 0, skipped: 9, failed: 0 });
            dependencies.getBalance.execute.mockResolvedValue({ balanceBrlCents: 100 });

            // When
            await runJob(sut, dependencies, scheduleMock, now);

            // Then
            expect(sendFn).toHaveBeenCalled();
            expect(moneySendFn).not.toHaveBeenCalled();
            expect(dependencies.eventLogger.log).toHaveBeenCalledWith(expect.objectContaining({
                eventMessage: "Money Channel not delivered: money-channel-id",
            }));
        })

        it("should still deliver the report when the money channel fetch rejects", async () => {
            // Given
            const { sut, scheduleMock, dependencies, channelFetchFn, sendFn, moneySendFn, now } = makeFailureSut();
            channelFetchFn.mockRejectedValue(new Error("fetch boom"));
            dependencies.monthlyCostSettlement.execute.mockResolvedValue({ inserted: 0, skipped: 9, failed: 0 });
            dependencies.getBalance.execute.mockResolvedValue({ balanceBrlCents: 100 });

            // When
            await runJob(sut, dependencies, scheduleMock, now);

            // Then
            expect(sendFn).toHaveBeenCalled();
            expect(moneySendFn).not.toHaveBeenCalled();
            expect(dependencies.eventLogger.log).toHaveBeenCalledWith(expect.objectContaining({
                eventMessage: "Money Channel not delivered: money-channel-id",
            }));
        })
    })
})