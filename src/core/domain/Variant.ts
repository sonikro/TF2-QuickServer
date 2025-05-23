import config from "config";

export enum Variant {
    StandardCompetitive = "standard-competitive",
    InsertCoin = "insertcoin",
    Tf2Pickup = "tf2pickup"
}

export type VariantConfig = {
    image: string;
    hostname?: string;
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
    /**
     * This will override the admins list in the server config. If not set, the user that created the server will be added as an admin.
     */
    admins?: readonly string[];
    /**
     * The amount of time in minutes before the server is terminated if it is empty.
     * @default 10
     */
    emptyMinutesTerminate?: number;
}

export function isValidVariant(variant: string): variant is Variant {
    return Object.values(Variant).includes(variant as Variant);
}

export function getVariantConfig(variant: Variant) {
    const defaultSettings = config.get<VariantConfig>(`variants.default`);
    const variantConfig = config.get<VariantConfig>(`variants.${variant}`); // This will throw if the variant is not found
    return {
        ...defaultSettings,
        ...variantConfig,
    };
}

export function getVariantConfigs() {
    const variants = Object.values(Variant);
    return variants.map(variant => ({
        name: variant,
        config: getVariantConfig(variant),
    }));
}