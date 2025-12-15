import { GuildVariant } from "../domain/GuildVariant";
import { VariantRepository } from "../repository/VariantRepository";

export type CreateVariantParams = {
    guildId: string;
    variantName: string;
    displayName?: string;
    hostname?: string;
    defaultCfgs?: Record<string, string>;
    admins?: string[];
    image?: string;
    emptyMinutesTerminate?: number;
}

export class CreateVariant {
    constructor(private readonly dependencies: {
        variantRepository: VariantRepository;
    }) {}

    async execute(params: CreateVariantParams): Promise<GuildVariant> {
        const existingVariant = await this.dependencies.variantRepository.findByGuildIdAndName({
            guildId: params.guildId,
            variantName: params.variantName,
        });

        if (existingVariant) {
            throw new Error(`Variant ${params.variantName} already exists for this guild`);
        }

        const variant: GuildVariant = {
            guildId: params.guildId,
            variantName: params.variantName,
            displayName: params.displayName,
            hostname: params.hostname,
            defaultCfgs: params.defaultCfgs,
            admins: params.admins,
            image: params.image,
            emptyMinutesTerminate: params.emptyMinutesTerminate,
        };

        return await this.dependencies.variantRepository.create({ variant });
    }
}
