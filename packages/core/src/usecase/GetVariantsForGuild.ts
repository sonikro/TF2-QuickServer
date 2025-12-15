import { GuildVariant } from "../domain/GuildVariant";
import { VariantRepository } from "../repository/VariantRepository";

export type GetVariantsForGuildParams = {
    guildId: string;
}

export class GetVariantsForGuild {
    constructor(private readonly dependencies: {
        variantRepository: VariantRepository;
    }) {}

    async execute(params: GetVariantsForGuildParams): Promise<GuildVariant[]> {
        return await this.dependencies.variantRepository.findByGuildId({
            guildId: params.guildId,
        });
    }
}
