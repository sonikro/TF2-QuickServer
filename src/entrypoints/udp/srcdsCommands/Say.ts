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
            handler: async ({ args, password: serverId, services }) => {
                const { serverRepository, userRepository, serverCommander, serverManager, eventLogger } = services;
                const { userId, steamId3, message } = args;

                switch (message) {
                    case "!terminate":
                        console.log(`User ${userId} (${steamId3}) requested termination on server ${serverId}`);
                        const server = await serverRepository.findById(serverId);
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

                            await serverManager.deleteServer({
                                region: server.region,
                                serverId: server.serverId
                            })

                            await serverRepository.deleteServer(server.serverId);

                            await eventLogger.log({
                                eventMessage: `User <@${userId}> terminated server ${serverId} from inside the game.`,
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