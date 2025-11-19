import config from "config";

export type CreditsConfig = {
    enabled: boolean;
}

export function getCreditsConfig(): CreditsConfig {
    return config.get<CreditsConfig>("credits");
}