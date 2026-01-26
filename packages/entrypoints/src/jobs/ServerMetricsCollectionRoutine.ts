import { logger } from "@tf2qs/telemetry";
import schedule from "node-schedule";
import { CollectServerMetrics, EventLogger } from "@tf2qs/core";

type ScheduleServerMetricsCollectionRoutineDependencies = {
    collectServerMetrics: CollectServerMetrics;
    eventLogger: EventLogger;
};

export const scheduleServerMetricsCollectionRoutine = (
    dependencies: ScheduleServerMetricsCollectionRoutineDependencies
) => {
    schedule.scheduleJob("*/10 * * * *", async () => {
        try {
            logger.emit({
                severityText: "INFO",
                body: "Running Server Metrics Collection Routine...",
            });
            await dependencies.collectServerMetrics.execute();
            logger.emit({
                severityText: "INFO",
                body: "Server Metrics Collection Routine completed successfully.",
            });
        } catch (error) {
            logger.emit({
                severityText: "ERROR",
                body: "Error during Server Metrics Collection Routine",
                attributes: { error: JSON.stringify(error, Object.getOwnPropertyNames(error)) },
            });
            await dependencies.eventLogger.log({
                eventMessage: `Error during Server Metrics Collection Routine: ${error instanceof Error ? error.message : String(error)}`,
                actorId: "system",
            });
        }
    });
};
