import { Client } from "discord.js";
import { Server } from "../domain";
import { UserError } from "../errors/UserError";
import { ScheduledServerRepository } from "../repository/ScheduledServerRepository";
import { EventLogger } from "../services/EventLogger";
import { CreateServerForUser } from "./CreateServerForUser";
import { failSafeDirectMessage } from "../utils/failSafeDirectMessage";

export class ExecuteScheduledServerCreation {

    constructor(private readonly dependencies: {
        scheduledServerRepository: ScheduledServerRepository,
        createServerForUser: CreateServerForUser,
        discordBot: Client,
        eventLogger: EventLogger,
        serverMessageFormatter: (server: Server) => string,
    }) { }

    public async execute({ scheduleId }: { scheduleId: string }): Promise<void> {
        const { scheduledServerRepository, createServerForUser, discordBot, eventLogger, serverMessageFormatter } = this.dependencies;

        const schedule = await scheduledServerRepository.findById(scheduleId);
        if (!schedule) {
            await eventLogger.log({
                actorId: 'system',
                eventMessage: `Scheduled server ${scheduleId} not found when processing its creation — it was likely already processed or deleted.`
            });
            return;
        }

        await failSafeDirectMessage(discordBot, schedule.userId, '⏳ Your scheduled server is being created…');

        try {
            const server = await createServerForUser.execute({
                region: schedule.region,
                variantName: schedule.variant,
                creatorId: schedule.userId,
                guildId: schedule.guildId ?? undefined,
                statusUpdater: async () => {},
            });
            await scheduledServerRepository.markStatus(schedule.id, "created", server.serverId, new Date());
            // Connection info DM — DM-ability was verified at scheduling time, so a
            // failure here does not abort or revert the creation (edge case 7)
            await failSafeDirectMessage(discordBot, schedule.userId, serverMessageFormatter(server));
            await eventLogger.log({
                actorId: schedule.userId,
                eventMessage: `Scheduled server ${schedule.id} created successfully.`
            });
        } catch (error) {
            await scheduledServerRepository.markStatus(schedule.id, "failed", undefined, new Date());
            const reason = error instanceof UserError
                ? error.message
                : 'Your scheduled server could not be created due to an unexpected error.';
            await failSafeDirectMessage(discordBot, schedule.userId, reason);
            await eventLogger.log({
                actorId: schedule.userId,
                eventMessage: `Scheduled server ${schedule.id} creation failed: ${error instanceof Error ? error.message : String(error)}`
            });
        }
    }
}
