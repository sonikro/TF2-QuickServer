import { VariantRepository } from "../repository/VariantRepository";

export type DeleteVariantParams = {
    guildId: string;
    variantName: string;
}

export class DeleteVariant {
    constructor(private readonly dependencies: {
        variantRepository: VariantRepository;
    }) {}

    async execute(params: DeleteVariantParams): Promise<void> {
        const existingVariant = await this.dependencies.variantRepository.findByGuildIdAndName({
            guildId: params.guildId,
            variantName: params.variantName,
        });

        if (!existingVariant) {
            throw new Error(`Variant ${params.variantName} does not exist for this guild`);
        }

        await this.dependencies.variantRepository.deleteByGuildIdAndName({
            guildId: params.guildId,
            variantName: params.variantName,
        });
    }
}
