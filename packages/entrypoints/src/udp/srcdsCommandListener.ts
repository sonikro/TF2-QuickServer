import { logger } from '@tf2qs/telemetry/src/otel';
import { ResilientLogReceiver } from "./ResilientLogReceiver";
import { UDPCommandsServices } from "./srcdsCommands/UDPCommandServices";

export async function startSrcdsCommandListener(dependencies: UDPCommandsServices) {
    new ResilientLogReceiver({
        address: "0.0.0.0",
        port: process.env.SRCDS_COMMAND_LISTENER_PORT ? Number(process.env.SRCDS_COMMAND_LISTENER_PORT) : 27100,
        services: dependencies,
    });
    logger.emit({ severityText: 'INFO', body: '[SRCDS Command Listener] Started listening for commands.' });
}