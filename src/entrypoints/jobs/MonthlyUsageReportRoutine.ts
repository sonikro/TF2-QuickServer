import { Client, ChannelType } from "discord.js";
import schedule from "node-schedule";
import { GenerateMonthlyUsageReport } from "../../core/usecase/GenerateMonthlyUsageReport";
import { ConfigManager } from "../../core/utils/ConfigManager";
import { EventLogger } from "../../core/services/EventLogger";
import { logger } from "../../telemetry/otel";
import { MonthlyReportFormatter } from "../../providers/services/MonthlyReportFormatter";

export type ScheduleMonthlyUsageReportRoutineDependencies = {
  generateMonthlyUsageReport: GenerateMonthlyUsageReport;
  configManager: ConfigManager;
  eventLogger: EventLogger;
  discordClient: Client;
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
      const message = formatter.format(report);

      await channel.send(message);

      logger.emit({
        severityText: "INFO",
        body: "Monthly Usage Report Routine completed successfully.",
      });

      await eventLogger.log({
        eventMessage: `Monthly Usage Report for ${report.month}/${report.year} posted successfully.`,
        actorId: "system",
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
