import { Client } from "discord.js";
import { logger } from '@tf2qs/telemetry';

export async function failSafeDirectMessage(discordBot: Client, userId: string, message: string): Promise<void> {
    try {
        const user = await discordBot.users.fetch(userId);
        await user.send(message);
    } catch (error) {
        // Fail silently — direct message delivery must never abort the caller's flow
        logger.emit({ severityText: 'WARN', body: 'Failed to send direct message', attributes: { userId, error: JSON.stringify(error, Object.getOwnPropertyNames(error)) } });
    }
}
