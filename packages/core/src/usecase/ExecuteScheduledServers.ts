import { Client } from "discord.js";
import { ScheduledServerRepository } from "../repository/ScheduledServerRepository";
import { EventLogger } from "../services/EventLogger";
import { BackgroundTaskQueue } from "../services/BackgroundTaskQueue";
import { failSafeDirectMessage } from "../utils/failSafeDirectMessage";

const STUCK_CREATING_THRESHOLD_MS = 20 * 60 * 1000; // 20 minutes
const GRACE_PERIOD_MS = 30 * 60 * 1000; // 30 minutes

export class ExecuteScheduledServers {

    constructor(private readonly dependencies: {
        scheduledServerRepository: ScheduledServerRepository,
        backgroundTaskQueue: BackgroundTaskQueue,
        discordBot: Client,
        eventLogger: EventLogger,
    }) { }

    public async execute(): Promise<void> {
        const { scheduledServerRepository, backgroundTaskQueue, discordBot, eventLogger } = this.dependencies;
        const now = new Date();

        // Recover schedules stuck in 'creating' (bot restarted/crashed mid-creation)
        const stuckBefore = new Date(now.getTime() - STUCK_CREATING_THRESHOLD_MS);
        const stuck = await scheduledServerRepository.findStuckCreating(stuckBefore);
        for (const schedule of stuck) {
            await scheduledServerRepository.markStatus(schedule.id, "failed", undefined, now);
            await failSafeDirectMessage(discordBot, schedule.userId, 'Your scheduled server creation did not complete (the bot restarted mid-creation). Please check /get-my-servers and schedule again if needed.');
            await eventLogger.log({
                actorId: schedule.userId,
                eventMessage: `Scheduled server ${schedule.id} marked as failed after being stuck in creating for over 20 minutes.`
            });
        }

        // Process due schedules
        const due = await scheduledServerRepository.findDue(now);
        for (const schedule of due) {
            // Bot was offline past the trigger time + grace period
            if (now.getTime() - schedule.triggerAt.getTime() > GRACE_PERIOD_MS) {
                await scheduledServerRepository.markStatus(schedule.id, "failed", undefined, now);
                await failSafeDirectMessage(discordBot, schedule.userId, 'Your scheduled time has already passed and the bot was offline — please schedule again.');
                continue;
            }

            const claimed = await scheduledServerRepository.claimForProcessing(schedule.id, now);
            if (!claimed) {
                continue;
            }

            // Enqueue the creation as a background task — the routine must not block
            // on it, since each creation can take several minutes
            await backgroundTaskQueue.enqueue('create-scheduled-server', { scheduleId: schedule.id }, undefined, undefined, { ownerId: schedule.userId });
        }
    }
}
