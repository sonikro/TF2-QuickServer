import { Client, ChannelType } from "discord.js";
import schedule from "node-schedule";
import { DiscordConfig } from "@tf2qs/core";
import { GenerateMonthlyUsageReport } from "@tf2qs/core";
import { ConfigManager } from "@tf2qs/core";
import { EventLogger } from "@tf2qs/core";
import { GetBalance } from "@tf2qs/core";
import { MonthlyCostSettlement } from "@tf2qs/core";
import { toDisplayBrl } from "@tf2qs/core";
import { logger } from "@tf2qs/telemetry";
import { MonthlyReportFormatter } from "@tf2qs/providers";
import { sendMoneyChannelMessage } from "../discord/sendMoneyChannelMessage";

export type ScheduleMonthlyUsageReportRoutineDependencies = {
  generateMonthlyUsageReport: GenerateMonthlyUsageReport;
  configManager: ConfigManager;
  eventLogger: EventLogger;
  discordClient: Client;
  monthlyCostSettlement: MonthlyCostSettlement;
  getBalance: GetBalance;
};

export const scheduleMonthlyUsageReportRoutine = (
  dependencies: ScheduleMonthlyUsageReportRoutineDependencies
) => {
  const { generateMonthlyUsageReport, configManager, eventLogger, discordClient } = dependencies;

  schedule.scheduleJob("0 15 1 * *", async () => {
    try {
      logger.emit({
        severityText: "INFO",
        body: "Running Monthly Usage Report Routine...",
      });

      const now = new Date();
      const previousMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);

      const report = await generateMonthlyUsageReport.execute({ date: previousMonthDate });

      const discordConfig = configManager.getDiscordConfig();
      const reportChannelId = discordConfig.reportDiscordChannelId;

      if (!reportChannelId) {
        logger.emit({
          severityText: "WARN",
          body: "Monthly Usage Report Channel ID is not configured. Please set reportDiscordChannelId in the config.",
        });
        return;
      }

      const channel = discordClient.channels.cache.get(reportChannelId);

      if (!channel) {
        logger.emit({
          severityText: "ERROR",
          body: `Monthly Usage Report Channel not found: ${reportChannelId}`,
        });
        await eventLogger.log({
          eventMessage: `Monthly Usage Report Channel not found: ${reportChannelId}`,
          actorId: "system",
        });
        return;
      }

      if (channel.type !== ChannelType.GuildText) {
        logger.emit({
          severityText: "ERROR",
          body: `Monthly Usage Report Channel is not a text channel: ${reportChannelId}`,
        });
        return;
      }

      const formatter = new MonthlyReportFormatter();
      const message = formatter.format(report, { supportChannelId: discordConfig.supportChannelId });

      await channel.send(message);

      logger.emit({
        severityText: "INFO",
        body: "Monthly Usage Report Routine completed successfully.",
      });

      await eventLogger.log({
        eventMessage: `Monthly Usage Report for ${report.month}/${report.year} posted successfully.`,
        actorId: "system",
      });

      await settleMonthlyCosts({
        monthlyCostSettlement: dependencies.monthlyCostSettlement,
        getBalance: dependencies.getBalance,
        discordConfig,
        discordClient,
        eventLogger,
        month: report.month,
        year: report.year,
      });
    } catch (error) {
      logger.emit({
        severityText: "ERROR",
        body: "Error during Monthly Usage Report Routine",
        attributes: {
          error: JSON.stringify(error, Object.getOwnPropertyNames(error)),
        },
      });
      await eventLogger.log({
        eventMessage: `Error during Monthly Usage Report Routine: ${
          error instanceof Error ? error.message : String(error)
        }`,
        actorId: "system",
      });
    }
  });

};

type SettleMonthlyCostsParams = {
  monthlyCostSettlement: MonthlyCostSettlement;
  getBalance: GetBalance;
  discordConfig: DiscordConfig;
  discordClient: Client;
  eventLogger: EventLogger;
  month: number;
  year: number;
};

async function settleMonthlyCosts(params: SettleMonthlyCostsParams): Promise<void> {
  const { monthlyCostSettlement, getBalance, discordConfig, discordClient, eventLogger, month, year } = params;

  try {
    const moneyChannelId = discordConfig.moneyChannelId;

    if (!moneyChannelId) {
      logger.emit({
        severityText: "WARN",
        body: "Money Channel ID is not configured. Skipping money settlement post.",
      });
      return;
    }

    const settlement = await monthlyCostSettlement.execute({ month, year });
    const { balanceBrlCents } = await getBalance.execute();

    const delivered = await sendMoneyChannelMessage({
      discordClient,
      moneyChannelId,
      content: `💰 **Money ledger — costs for ${month}/${year} settled**\n* New cost entries: ${settlement.inserted}\n* Already recorded: ${settlement.skipped}\n* Failed: ${settlement.failed}\n* Current balance: R$ ${toDisplayBrl({ balanceBrlCents })}`,
    });

    if (!delivered) {
      await eventLogger.log({
        eventMessage: `Money Channel not delivered: ${moneyChannelId}`,
        actorId: "system",
      });
      return;
    }

    await eventLogger.log({
      eventMessage: `Monthly costs for ${month}/${year} settled and posted to money channel.`,
      actorId: "system",
    });
  } catch (error) {
    logger.emit({
      severityText: "ERROR",
      body: "Error during monthly cost settlement",
      attributes: {
        error: JSON.stringify(error, Object.getOwnPropertyNames(error)),
      },
    });
    await eventLogger.log({
      eventMessage: `Error during monthly cost settlement: ${
        error instanceof Error ? error.message : String(error)
      }`,
      actorId: "system",
    });
  }
}
