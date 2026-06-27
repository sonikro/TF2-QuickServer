import config from "config";

export type DiscordConfig = {
    logChannelId: string;
    reportDiscordChannelId: string;
    streamerChannelId: string;
    supportChannelId: string;
}

export const getDiscordConfig = () => {
    return config.get<DiscordConfig>("discord");
}
