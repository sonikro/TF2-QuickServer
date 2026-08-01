import { ScheduledServer } from "../domain";
import { UserError } from "../errors/UserError";
import { ScheduledServerRepository } from "../repository/ScheduledServerRepository";
import { EventLogger } from "../services/EventLogger";

export class CancelScheduledServer {
    constructor(private readonly dependencies: {
        scheduledServerRepository: ScheduledServerRepository,
        eventLogger: EventLogger,
    }) { }

    async execute(args: { userId: string }): Promise<ScheduledServer> {
        const { scheduledServerRepository, eventLogger } = this.dependencies;
        const { userId } = args;

        const active = await scheduledServerRepository.findActiveByUserId(userId);
        if (active.length === 0) {
            throw new UserError('You don\'t have an active scheduled server.');
        }

        const schedule = active[0];
        if (schedule.status === 'creating') {
            throw new UserError('It\'s too late to cancel — your server creation has already started.');
        }

        const now = new Date();
        const cancelled = await scheduledServerRepository.cancel(schedule.id, now);
        if (!cancelled) {
            throw new UserError('Your schedule could not be cancelled (it may have just started). Please check /show-schedules.');
        }

        const cancelledSchedule: ScheduledServer = {
            ...schedule,
            status: "cancelled",
            updatedAt: now,
        };

        await eventLogger.log({
            actorId: userId,
            eventMessage: `User cancelled their scheduled server for ${schedule.scheduledAt.toISOString()}`
        });

        return cancelledSchedule;
    }
}
