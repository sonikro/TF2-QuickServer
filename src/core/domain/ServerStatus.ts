export class ServerStatus {

    public readonly numberOfPlayers?: number;
    public readonly serverIp?: string;
    public readonly serverPort?: number;
    public readonly sourceTVIp?: string | null;
    public readonly sourceTVPort?: number | null;

    constructor(private readonly statusString: string) {
        // Server IP and Source TV IP extraction
        const addressRegex = /udp\/ip\s*:\s*([\d.]+:\d+)/;
        const tvRegex = /sourcetv:\s*([\d.]+:\d+)/;

        const address: string | undefined = statusString.match(addressRegex)?.[1];
        const tvAddress: string | undefined = statusString.match(tvRegex)?.[1];
        if (address) {
            const [ip, port] = address.split(":");
            this.serverIp = ip;
            this.serverPort = parseInt(port, 10);
        }
        if (tvAddress) {
            const [tvIp, tvPort] = tvAddress.split(":");
            this.sourceTVIp = tvIp;
            this.sourceTVPort = parseInt(tvPort, 10);
        }

        // Parse number of players
        const statusClaims = this.statusString.split("\n");
        const playersClaim = statusClaims.find(claim => claim.startsWith("players :"));
        if (!playersClaim) {
            throw new Error(`Could not find players`);
        }
        const numbers = playersClaim.match(/\d+/);
        if (numbers) {
            this.numberOfPlayers = parseInt(numbers[0], 10);
        }
    }


}