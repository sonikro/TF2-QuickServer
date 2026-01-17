import { logger } from '@tf2qs/telemetry';
import { SRCDSCommandParser } from "./SRCDSCommand";
import { publicIpv4 } from "public-ip"

export const rcon: SRCDSCommandParser<{ sourceIp: string, command: string }> = (rawString) => {
    // Example: 'rcon from "1.1.1.1:51736": command "status"'
    const match = rawString.match(/rcon from "([^"]+)": command "([^"]+)"/);
    if (match) {
        return {
            raw: rawString,
            args: { sourceIp: match[1], command: match[2] },
            type: "rcon",
            handler: async ({ args, password: logSecret, services }) => {
                const { sourceIp, command } = args;
                const server = await services.serverRepository.findByLogsecret(Number(logSecret));
                if (!server) return;
                /**
                 * Ideally the status command should not be used by anyone other than the TF2-QuickServer itself.
                 * If it is used, we log a warning and send a message to the server.
                 * This is to help prevent unauthorized access to player IP addresses.
                 */
                if (args.command === "status") {
                    const myIP = await publicIpv4();
                    const sourceCommandIP = sourceIp.split(":")[0];
                    const extraAllowedIps = process.env.STATUS_EXTRA_ALLOWED_IPS ? process.env.STATUS_EXTRA_ALLOWED_IPS.split(",") : [];
                    const allowedIPs = [myIP, "127.0.0.1", ...extraAllowedIps];
                    if (!allowedIPs.includes(sourceCommandIP)) {
                        await services.serverCommander.query({
                            host: server.rconAddress,
                            port: 27015,
                            password: server.rconPassword,
                            command: "say Warning: An unexpected STATUS command was received. This could mean a server admin is trying to get player IP addresses.",
                            timeout: 5000
                        })
                        logger.emit({
                            severityText: 'WARN',
                            body: `Unexpected STATUS command from ${sourceIp} on server ${server.serverId}. This could indicate an unauthorized attempt to access player IP addresses.`,
                            attributes: { serverId: server.serverId, sourceIp, command }
                        });
                    }
                }
            }
        };
    }
    return null;
}