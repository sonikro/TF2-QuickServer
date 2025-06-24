import { SRCDSCommandParser } from "./SRCDSCommand";

export const userEnteredGame: SRCDSCommandParser<{ steamId3: string; userId: string }> = (rawString) => {
    // Example: "06/22/2025 - 22:33:41: \"sonikro<6><[U:1:29162964]><>\" entered the game"
    const match = rawString.match(/<([0-9]+)>\s*<\[([^\]]+)\]>.*" entered the game$/);
    if (match) {
        return {
            raw: rawString,
            args: { userId: match[1], steamId3: match[2] },
            type: "userEnteredGame",
            handler: async ({ args, password: serverId, services }) => {
                const { serverCommander, userBanRepository, serverRepository } = services;
                const { userId, steamId3 } = args;

                console.log(`User entered game: ${userId} (${steamId3}) on server ${serverId}`);

                // Check if user is banned
                const banResult = await userBanRepository.isUserBanned(steamId3);
                if (!banResult.isBanned) return;

                // Find server by ID
                const server = await serverRepository.findById(serverId);
                if (!server) return;

                // Ban the user using RCON
                console.log(`Banning user ${userId} (${steamId3}) on server ${serverId}`);
                await serverCommander.query({
                    host: server.rconAddress,
                    port: 27015,
                    password: server.rconPassword,
                    command: `sm_ban #${userId} 0 ${banResult.reason ? `${banResult.reason}` : 'You are banned from TF2-QuickServer'}`,
                    timeout: 5000
                });
            }
        };
    }
    return null;
};
