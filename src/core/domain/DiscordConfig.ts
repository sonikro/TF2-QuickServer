import config from "config";

export type DiscordConfig = {
    logChannelId: string;
}

export const getDiscordConfig = () => {
    return config.get<DiscordConfig>("discord");
}
