import { PlayerConnectionHistory } from "../domain/PlayerConnectionHistory";

export interface PlayerConnectionHistoryRepository {
    save(params: { connectionHistory: Omit<PlayerConnectionHistory, "id"> }): Promise<PlayerConnectionHistory>;
    getDistinctIpsBySteamId3(steamId3: string): Promise<string[]>;
}
