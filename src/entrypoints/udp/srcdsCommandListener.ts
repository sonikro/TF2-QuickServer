import { parseSRCDSCommand } from "./srcdsCommands";
import { UDPCommandsServices } from "./srcdsCommands/UDPCommandServices";
import { LogReceiver } from "@c43721/srcds-log-receiver";

export async function startSrcdsCommandListener(dependencies: UDPCommandsServices) {
    const receiver = new LogReceiver({
        address: "0.0.0.0",
        port: process.env.SRCDS_COMMAND_LISTENER_PORT ? Number(process.env.SRCDS_COMMAND_LISTENER_PORT) : 27100,
    });

    console.log("SRCDS Log receiver running.. ");

    receiver.on("event", async ({ message, password }: { message: string, password: string }) => {
        const command = parseSRCDSCommand(message);
        if (command) {
            try {
                await command.handler({ args: command.args, password, services: dependencies });
            } catch (error) {
                console.error(`[SRCDS Command Handler Error] ${error}`);
            }
        }
    });

}