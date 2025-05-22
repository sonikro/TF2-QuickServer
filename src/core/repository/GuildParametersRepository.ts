import { GuildParameters } from "../domain/GuildParameters";

export interface GuildParametersRepository {
    findById(guildId: string): Promise<GuildParameters | null>;
}