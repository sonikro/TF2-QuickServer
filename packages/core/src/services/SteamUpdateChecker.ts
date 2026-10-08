export type SteamUpdateCheckResult = {
    upToDate: boolean;
    requiredVersion: string;
};

export interface SteamUpdateChecker {
    checkUpdate(params: {
        appId: number;
        currentVersion: string;
    }): Promise<SteamUpdateCheckResult>;
}
