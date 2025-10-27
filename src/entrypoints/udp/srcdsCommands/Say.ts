import { logger } from '../../../telemetry/otel';
import SteamID from "steamid";
import { SRCDSCommandParser } from "./SRCDSCommand";

export const say: SRCDSCommandParser<{ userId: number, steamId3: string, message: string }> = (rawString) => {
    // Example: "06/25/2025 - 02:43:46: \"sonikro<3><[U:1:29162964]><Blue>\" say \"!terminate\""
    const match = rawString.match(/<([^<>]+)><\[([^\]]+)\]>.*say\s+"([^"]+)"/);
    if (match) {
        return {
            raw: rawString,
            args: { userId: Number(match[1]), steamId3: match[2], message: match[3] },
            type: "say",
            handler: async ({ args, password: logSecret, services }) => {
                const { serverRepository, userRepository, serverCommander, eventLogger } = services;
                const { userId, steamId3, message } = args;

                switch (message) {
                    case "!terminate":
                        logger.emit({ severityText: 'INFO', body: `User ${userId} (${steamId3}) requested termination on server with logSecret ${logSecret}` });
                        const server = await serverRepository.findByLogsecret(Number(logSecret));
                        if (!server)
                            return
                        const steamId = new SteamID(`[${steamId3}]`);
                        const steamId2 = steamId.getSteam2RenderedID();
                        const user = await userRepository.findBySteamId(steamId2)
                        if (!user) return

                        // Check if the user is the creator of the server
                        if (user.id === server.createdBy) {
                            await serverCommander.query({
                                host: server.rconAddress,
                                port: 27015,
                                password: server.rconPassword,
                                command: "say [TF2-QuickServer] Server is being terminated, please wait up to 15 seconds.",
                                timeout: 5000
                            })

                            await services.backgroundTaskQueue.enqueue('delete-server-for-user', { userId: user.id }, undefined, {
                                maxRetries: 10,
                                initialDelayMs: 60000,
                                maxDelayMs: 600000,
                                backoffMultiplier: 2,
                            });

                            await eventLogger.log({
                                eventMessage: `User <@${userId}> initiated server ${server.serverId} termination from inside the game.`,
                                actorId: user.id,
                            })
                        }
                        break;
                    default:
                        break;
                }
            }
        };
    }
    return null;
}