import { ChannelType, Client } from "discord.js";
import { logger } from "@tf2qs/telemetry";

type SendMoneyChannelMessageParams = {
    discordClient: Client;
    moneyChannelId: string;
    content: string;
};

export async function sendMoneyChannelMessage(params: SendMoneyChannelMessageParams): Promise<boolean> {
    const { discordClient, moneyChannelId, content } = params;

    if (!moneyChannelId) {
        logger.emit({
            severityText: "WARN",
            body: "Money Channel ID is not configured. Skipping money channel post.",
        });
        return false;
    }

    try {
        const channel = await discordClient.channels.fetch(moneyChannelId);

        if (!channel) {
            logger.emit({
                severityText: "ERROR",
                body: `Money Channel not found: ${moneyChannelId}`,
            });
            return false;
        }

        if (channel.type !== ChannelType.GuildText) {
            logger.emit({
                severityText: "ERROR",
                body: `Money Channel is not a text channel: ${moneyChannelId}`,
            });
            return false;
        }

        await channel.send(content);
        return true;
    } catch (error) {
        logger.emit({
            severityText: "ERROR",
            body: `Money Channel post failed: ${moneyChannelId}`,
            attributes: {
                error: JSON.stringify(error, Object.getOwnPropertyNames(error)),
            },
        });
        return false;
    }
}
