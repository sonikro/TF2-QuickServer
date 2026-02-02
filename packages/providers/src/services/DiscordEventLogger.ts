import { logger } from '@tf2qs/telemetry';
import { Client, TextChannel } from "discord.js";
import { EventLogger } from "@tf2qs/core";

export class DiscordEventLogger implements EventLogger {

    constructor(private readonly dependencies: {
        discordClient: Client,
        channelId: string;
    }){}

    async log(args: { eventMessage: string; actorId: string; }): Promise<void> {
        const { eventMessage, actorId } = args;
        const channel = await this.dependencies.discordClient.channels.fetch(this.dependencies.channelId);

        if (channel?.isTextBased()) {
            const textChannel = channel as TextChannel;
            await textChannel.send(`**Event:** ${eventMessage}\n**Actor:** <@${actorId}>`);
        } else {
            logger.emit({ severityText: 'ERROR', body: `Failed to log event: Log channel with ID ${this.dependencies.channelId} is not text-based or does not exist.` });
        }
    }

}