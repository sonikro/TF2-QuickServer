import { PlayerConnectionHistory } from "../domain/PlayerConnectionHistory";

export interface PlayerConnectionHistoryRepository {
    save(params: { connectionHistory: Omit<PlayerConnectionHistory, "id"> }): Promise<PlayerConnectionHistory>;
}
