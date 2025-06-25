import { LogReceiver } from "@c43721/srcds-log-receiver";
import { UDPCommandsServices } from "./srcdsCommands/UDPCommandServices";
import { parseSRCDSCommand } from "./srcdsCommands";

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

        console.log(`[SRCDS Log Receiver] Starting on ${address}:${port}`);

        const receiver = new LogReceiver({ address, port });

        receiver.on("event", async ({ message, password }) => {
            const command = parseSRCDSCommand(message);
            if (command) {
                try {
                    await command.handler({ args: command.args, password, services });
                } catch (error) {
                    console.error(`[SRCDS Command Handler Error] ${error}`);
                }
            }
        });

        receiver.on("error", (err) => {
            console.error(`[SRCDS Log Receiver Error] ${err}`);
            this.#scheduleRestart();
        });

        receiver.on("close", () => {
            console.warn("[SRCDS Log Receiver] Socket closed.");
            this.#scheduleRestart();
        });

        receiver.on("listening", () => {
            console.log(`[SRCDS Log Receiver] Listening on ${address}:${port}`);
        });

        receiver.on("connect", () => {
            console.log("[SRCDS Log Receiver] Connected");
        });

        this.#receiver = receiver;
    }

    #scheduleRestart() {
        if (this.#restartTimeout) return; // Already scheduled

        const delay = this.#options.restartDelayMs ?? 5000;

        console.log(`[SRCDS Log Receiver] Restarting in ${delay}ms...`);

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
