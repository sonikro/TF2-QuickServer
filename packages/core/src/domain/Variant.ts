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
     * Whether the server is managed by an external system.
     * If true, users will not receive connection details as the server is managed externally.
     * @default false
     */
    managedExternally?: boolean;
}