export type GuildVariant = {
    id?: number;
    guildId: string;
    variantName: string;
    displayName?: string;
    hostname?: string;
    defaultCfgs?: Record<string, string>;
    admins?: string[];
    image?: string;
    emptyMinutesTerminate?: number;
    createdAt?: Date;
    updatedAt?: Date;
}
