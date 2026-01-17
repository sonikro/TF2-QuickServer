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

    /**
     * Optional guild ID to associate the server with.
     * This is used for variants that are registered with a specific guild, like tf2pickup.
     * If set, the variant will only be available in that guild.
     */
    guildId?: string;

    /**
     * Custom message shown to the user when the server is created successfully.
     * Supports variable interpolation using double braces, e.g. {hostIp}, {hostPort}, {serverId}
     * Available variables come from the Server object properties.
     * If not set, the default server connection message will be shown.
     */
    customCreationMessage?: string;
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