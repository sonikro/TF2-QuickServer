import config from "config";

export enum Variant {
    StandardCompetitive = "standard-competitive",
    Passtime = "passtime",
}

export type VariantConfig = {
    image: string;
    ocpu: number;
    memory: number;
    maxPlayers: number;
    serverName: string;
    map: string;
    svPure: number;
    shape: string;
    defaultCfgs?: {
        "5cp": string;
        "koth": string;
        "pl": string;
        "ultiduo": string;
    };
}

export function isValidVariant(variant: string): variant is Variant {
    return Object.values(Variant).includes(variant as Variant);
}

export function getVariantConfig(variant: Variant) {
    const variantConfig = config.get<VariantConfig>(`variants.${variant}`); // This will throw if the variant is not found
    return variantConfig;
}

export function getVariantConfigs() {
    const variants = Object.values(Variant);
    return variants.map(variant => ({
        name: variant,
        config: getVariantConfig(variant),
    }));
}