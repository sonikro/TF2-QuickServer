import { UserError } from "../errors/UserError";
import { PlayerConnectionHistoryRepository } from "../repository/PlayerConnectionHistoryRepository";
import { isLinkLocalIp } from "../utils/isLinkLocalIp";
import { normalizeSteamId3 } from "../utils/normalizeSteamId3";

export type ComparePlayerSharedIpsResult = {
    steamId3a: string;
    steamId3b: string;
    sharedIps: string[];
};

type ComparePlayerSharedIpsParams = {
    steamId3TextA: string;
    steamId3TextB: string;
};

export class ComparePlayerSharedIps {
    constructor(private readonly dependencies: {
        playerConnectionHistoryRepository: PlayerConnectionHistoryRepository;
    }) {}

    async execute(params: ComparePlayerSharedIpsParams): Promise<ComparePlayerSharedIpsResult> {
        const { playerConnectionHistoryRepository } = this.dependencies;
        const { steamId3TextA, steamId3TextB } = params;

        const steamId3a = normalizeSteamId3(steamId3TextA);
        const steamId3b = normalizeSteamId3(steamId3TextB);

        if (steamId3a === steamId3b) {
            throw new UserError('The two Steam IDs must be different.');
        }

        const [ipsA, ipsB] = await Promise.all([
            playerConnectionHistoryRepository.getDistinctIpsBySteamId3(steamId3a),
            playerConnectionHistoryRepository.getDistinctIpsBySteamId3(steamId3b),
        ]);

        const filteredIpsA = ipsA.filter(ip => !isLinkLocalIp(ip));
        const filteredIpsB = ipsB.filter(ip => !isLinkLocalIp(ip));

        const ipsBSet = new Set(filteredIpsB);
        const sharedIps = filteredIpsA.filter(ip => ipsBSet.has(ip));

        return { steamId3a, steamId3b, sharedIps };
    }
}
