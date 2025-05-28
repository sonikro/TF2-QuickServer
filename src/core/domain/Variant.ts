import config from "config";

export type Variant = string;

export type VariantConfig = {
    displayName?: string;
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
        [mapName: string]: string;
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

export function getVariantConfig(variant: Variant) {
    const defaultSettings = config.get<VariantConfig>(`variants.default`);
    const variantConfig = config.get<VariantConfig>(`variants.${variant}`); // This will throw if the variant is not found
    return {
        ...defaultSettings,
        ...variantConfig,
    };
}

export function getVariantConfigs() {
    const variants = config.get<Record<string, VariantConfig>>(`variants`);
    return Object.keys(variants).filter(it => it !== "default").map(variant => ({
        name: variant,
        config: getVariantConfig(variant),
    }));
}