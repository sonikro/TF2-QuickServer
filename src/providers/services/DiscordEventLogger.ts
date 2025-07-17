import { logger } from '../../telemetry/otel';
import { Client, TextChannel } from "discord.js";
import { EventLogger } from "../../core/services/EventLogger";
import { ConfigManager } from "../../core/utils/ConfigManager";

export class DiscordEventLogger implements EventLogger {

    private readonly logChannelId: string;
    constructor(private readonly dependencies: {
        discordClient: Client,
        configManager: ConfigManager;
    }){
        this.logChannelId = this.dependencies.configManager.getDiscordConfig().logChannelId
    }

    async log(args: { eventMessage: string; actorId: string; }): Promise<void> {
        const { eventMessage, actorId } = args;
        const channel = await this.dependencies.discordClient.channels.fetch(this.logChannelId);

        if (channel?.isTextBased()) {
            const textChannel = channel as TextChannel;
            await textChannel.send(`**Event:** ${eventMessage}\n**Actor:** <@${actorId}>`);
        } else {
            logger.emit({ severityText: 'ERROR', body: `Failed to log event: Log channel with ID ${this.logChannelId} is not text-based or does not exist.` });
        }
    }

}