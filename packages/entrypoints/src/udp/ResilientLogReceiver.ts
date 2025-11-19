import { logger } from '@tf2qs/telemetry/src/otel';
import { LogReceiver } from "@c43721/srcds-log-receiver";
import { UDPCommandsServices } from "./srcdsCommands/UDPCommandServices";
import { parseSRCDSCommand } from "./srcdsCommands";
import { defaultGracefulShutdownManager } from "@tf2qs/providers/src/services/DefaultGracefulShutdownManager";

type ResilientLogReceiverOptions = {
    address: string;
    port: number;
    services: UDPCommandsServices;
    restartDelayMs?: number;
};

export class ResilientLogReceiver {
    #options: ResilientLogReceiverOptions;
    #receiver: LogReceiver | null = null;
    #restartTimeout: NodeJS.Timeout | null = null;

    constructor(options: ResilientLogReceiverOptions) {
        this.#options = options;
        this.#startReceiver();
    }

    #startReceiver() {
        const { address, port, services } = this.#options;

        logger.emit({ severityText: 'INFO', body: `[SRCDS Log Receiver] Starting on ${address}:${port}` });

        const receiver = new LogReceiver({ address, port });

        receiver.on("event", async ({ message, password }) => {
            const command = parseSRCDSCommand(message);
            if (command) {
                try {
                    const server = await services.serverRepository.findByLogsecret(Number(password));
                    logger.emit({ severityText: 'INFO', body: `[SRCDS Command Received] ${command.raw}`, attributes: { command: command.raw, args: command.args, serverId: server?.serverId } });
                    await defaultGracefulShutdownManager.run(() => command.handler({ args: command.args, password, services }))
                } catch (error: Error | any) {
                    await services.eventLogger.log({
                        eventMessage: `Error handling SRCDS command: ${command.raw} - ${error.message}`,
                        actorId: "system",
                    })
                    logger.emit({ severityText: 'ERROR', body: `[SRCDS Command Handler Error]`, attributes: { error: JSON.stringify(error, Object.getOwnPropertyNames(error)) } });
                }
            }
        });

        receiver.on("error", (err) => {
            logger.emit({ severityText: 'ERROR', body: `[SRCDS Log Receiver Error]`, attributes: { error: JSON.stringify(err, Object.getOwnPropertyNames(err)) } });
            this.#scheduleRestart();
        });

        receiver.on("close", () => {
            console.warn("[SRCDS Log Receiver] Socket closed.");
            this.#scheduleRestart();
        });

        receiver.on("listening", () => {
            logger.emit({ severityText: 'INFO', body: `[SRCDS Log Receiver] Listening on ${address}:${port}` });
        });

        receiver.on("connect", () => {
            logger.emit({ severityText: 'INFO', body: '[SRCDS Log Receiver] Connected' });
        });

        this.#receiver = receiver;
    }

    #scheduleRestart() {
        if (this.#restartTimeout) return; // Already scheduled

        const delay = this.#options.restartDelayMs ?? 5000;

        logger.emit({ severityText: 'INFO', body: `[SRCDS Log Receiver] Restarting in ${delay}ms...` });

        this.#restartTimeout = setTimeout(() => {
            this.#restartTimeout = null;
            this.#startReceiver();
        }, delay);
    }

    close() {
        if (this.#restartTimeout) {
            clearTimeout(this.#restartTimeout);
            this.#restartTimeout = null;
        }
        this.#receiver?.removeAllListeners();
        this.#receiver = null;
    }
}
