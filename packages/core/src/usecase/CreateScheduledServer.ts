import { Client } from "discord.js";
import { getRegionDisplayName, getVariantConfig, Region, ScheduledServer, Variant } from "../domain";
import { UserError } from "../errors/UserError";
import { ScheduledServerRepository } from "../repository/ScheduledServerRepository";
import { EventLogger } from "../services/EventLogger";
import { IdGenerator } from "../services/IdGenerator";
import { getScheduledCreationLeadMinutes } from "../domain/Region";
import { computeNextOccurrence, formatDateTimeInTimeZone, formatDurationUntil } from "../utils/scheduleTime";

export class CreateScheduledServer {

    constructor(private readonly dependencies: {
        scheduledServerRepository: ScheduledServerRepository,
        idGenerator: IdGenerator,
        discordBot: Client,
        eventLogger: EventLogger,
    }) { }

    public async execute(args: {
        userId: string,
        guildId?: string,
        region: Region,
        variantName: Variant,
        time: string,
        timezone: string,
    }): Promise<ScheduledServer> {
        const { scheduledServerRepository, idGenerator, discordBot, eventLogger } = this.dependencies;

        const existing = await scheduledServerRepository.findActiveByUserId(args.userId);
        if (existing.length > 0) {
            const active = existing[0];
            const variantDisplayName = getVariantConfig(active.variant).displayName ?? active.variant;
            throw new UserError(`You can only schedule one server at a time. You already have a schedule for ${variantDisplayName} on ${formatDateTimeInTimeZone(active.scheduledAt, active.timezone)}.`);
        }

        const now = new Date();
        const scheduledAt = computeNextOccurrence({ time: args.time, timezone: args.timezone, now });
        const triggerAt = new Date(scheduledAt.getTime() - getScheduledCreationLeadMinutes(args.region) * 60_000);

        const regionDisplayName = getRegionDisplayName(args.region);
        const variantDisplayName = getVariantConfig(args.variantName).displayName ?? args.variantName;
        const confirmationMessage =
            `🗓️ **Server Scheduled!**\n` +
            `Region: **${regionDisplayName}** · Variant: **${variantDisplayName}**\n` +
            `⏰ Ready at: **${formatDateTimeInTimeZone(scheduledAt, args.timezone)}** (${args.timezone})\n` +
            `🕐 (${formatDateTimeInTimeZone(scheduledAt, 'UTC')} UTC) — ${formatDurationUntil(scheduledAt, now)} from now\n` +
            `I'll DM you here when your server starts being created, and again with the connection info once it's ready.`;

        // DM validation: the schedule must NOT be persisted if the DM cannot be sent.
        try {
            const user = await discordBot.users.fetch(args.userId);
            await user.send(confirmationMessage);
        } catch (error) {
            throw new UserError('I need to be able to DM you to deliver your server connection info. Please enable DMs from this bot (User Settings → Privacy & Safety → allow messages from server members) and try again.');
        }

        const schedule: ScheduledServer = {
            id: idGenerator.generate(),
            userId: args.userId,
            guildId: args.guildId ?? null,
            region: args.region,
            variant: args.variantName,
            scheduledAt,
            triggerAt,
            status: "scheduled",
            serverId: null,
            timezone: args.timezone,
            createdAt: now,
            updatedAt: now,
        };

        await scheduledServerRepository.create(schedule);

        await eventLogger.log({
            actorId: args.userId,
            eventMessage: `User scheduled a server in region ${args.region} with variant ${args.variantName} for ${scheduledAt.toISOString()}`
        });

        return schedule;
    }
}
