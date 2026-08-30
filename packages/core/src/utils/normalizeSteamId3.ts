import SteamID from "steamid";
import { UserError } from "../errors/UserError";

export function normalizeSteamId3(steamIdText: string): string {
    let input = steamIdText.trim();
    if (/^[a-zA-Z]:\d+:\d+$/.test(input)) {
        input = `[${input}]`;
    }

    let steamId: SteamID;
    try {
        steamId = new SteamID(input);
    } catch {
        throw new UserError('Invalid Steam ID. Expected a SteamID3 in U format, e.g. U:1:29162964 or [U:1:29162964].');
    }

    const normalized = steamId.steam3().replace('[', '').replace(']', '');
    if (!normalized.startsWith('U:1:')) {
        throw new UserError('Invalid Steam ID. Expected a SteamID3 in U format, e.g. U:1:29162964.');
    }

    return normalized;
}
