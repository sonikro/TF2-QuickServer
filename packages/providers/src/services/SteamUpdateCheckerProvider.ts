import { SteamUpdateChecker, SteamUpdateCheckResult } from "@tf2qs/core";

export class SteamUpdateCheckerProvider implements SteamUpdateChecker {
    async checkUpdate(params: { appId: number; currentVersion: string }): Promise<SteamUpdateCheckResult> {
        const { appId, currentVersion } = params;
        const response = await fetch(
            `https://api.steampowered.com/ISteamApps/UpToDateCheck/v1/?appid=${appId}&version=${currentVersion}&format=json`,
            { signal: AbortSignal.timeout(20000) }
        );

        if (!response.ok) {
            throw new Error(`Steam UpToDateCheck request failed with status ${response.status}`);
        }

        let body: unknown;
        try {
            body = await response.json();
        } catch {
            throw new Error("Steam UpToDateCheck response is not valid JSON");
        }

        const steamResponse = (body as { response?: unknown })?.response as
            | { success?: unknown; up_to_date?: unknown; required_version?: unknown }
            | undefined;

        if (!steamResponse) {
            throw new Error("Steam UpToDateCheck response is missing expected structure");
        }

        if (steamResponse.success !== true) {
            throw new Error("Steam UpToDateCheck request was not successful");
        }

        const rawUpToDate = steamResponse.up_to_date;
        const upToDate = rawUpToDate === true || rawUpToDate === "true"
            ? true
            : rawUpToDate === false || rawUpToDate === "false"
                ? false
                : undefined;

        if (upToDate === undefined) {
            throw new Error(`Steam UpToDateCheck returned unexpected up_to_date value: ${String(rawUpToDate)}`);
        }

        const requiredVersion = steamResponse.required_version === undefined || steamResponse.required_version === null
            ? (upToDate ? currentVersion : undefined)
            : String(steamResponse.required_version);

        if (requiredVersion === undefined) {
            throw new Error("Steam UpToDateCheck response is missing required_version");
        }

        return { upToDate, requiredVersion };
    }
}
