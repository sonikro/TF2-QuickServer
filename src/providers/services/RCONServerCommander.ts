import { Rcon } from "rcon-client";
import { ServerCommander } from "../../core/services/ServerCommander";

export class RCONServerCommander implements ServerCommander {

    async query(args: { host: string; port: number; password: string; command: string; timeout?: number; }): Promise<string> {
        const { host, port, password, command, timeout } = args;
        const rcon = new Rcon({
            host, port, password, timeout
        });
        try {
            rcon.on("error", (error) => {
                console.error(`RCON connection error: ${error}`);
            })
            await rcon.connect();
            const response = await rcon.send(command);
            return response;
        } catch (error) {
            throw new Error(`RCON command failed: ${error}`);
        } finally {
            await rcon.end();
        }
    }

}
