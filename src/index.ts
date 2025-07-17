import { logger } from './telemetry/otel';
import "./telemetry/otel"
import { startDiscordBot } from "./entrypoints/discordBot";

// Initialize OpenTelemetry

// Initialize the Discord bot
startDiscordBot()
    .then(() => {
        logger.emit({ severityText: 'INFO', body: 'Discord bot started successfully.' });
    })
    .catch((error) => {
        logger.emit({ severityText: 'ERROR', body: 'Error starting Discord bot', attributes: { error: JSON.stringify(error, Object.getOwnPropertyNames(error)) } });
    });