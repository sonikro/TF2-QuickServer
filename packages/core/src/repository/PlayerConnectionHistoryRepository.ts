import { PlayerConnectionHistory } from "../domain/PlayerConnectionHistory";

export interface PlayerConnectionHistoryRepository {
    save(params: { connectionHistory: Omit<PlayerConnectionHistory, "id"> }): Promise<PlayerConnectionHistory>;
    findBySteamId3(params: { steamId3: string }): Promise<PlayerConnectionHistory[]>;
}
