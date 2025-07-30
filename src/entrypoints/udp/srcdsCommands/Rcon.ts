import { logger } from '../../../telemetry/otel';
import { SRCDSCommandParser } from "./SRCDSCommand";

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
                if (!server) {
                    logger.emit({ severityText: 'ERROR', body: `Server not found for logSecret ${logSecret}` });
                    return;
                }
                logger.emit({ severityText: 'INFO', body: `RCON command received from ${sourceIp}: ${command}`, attributes: { serverId: server.serverId } });
            }
        };
    }
    return null;
}