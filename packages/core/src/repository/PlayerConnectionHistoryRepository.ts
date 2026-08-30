import { PlayerConnectionHistory } from "../domain/PlayerConnectionHistory";

export type PlayerIpFirstSeen = {
    ipAddress: string;
    firstSeenAt: Date;
};

export interface PlayerConnectionHistoryRepository {
    save(params: { connectionHistory: Omit<PlayerConnectionHistory, "id"> }): Promise<PlayerConnectionHistory>;
    getFirstSeenIpsBySteamId3(steamId3: string): Promise<PlayerIpFirstSeen[]>;
}
