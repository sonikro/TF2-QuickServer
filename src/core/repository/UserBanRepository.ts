export interface UserBanRepository {
  /**
   * Checks if a user is banned by SteamID or DiscordID.
   * @param steamId The user's SteamID (string)
   * @param discordUserId The user's Discord user ID (string | undefined)
   * @returns Promise<boolean> - true if banned, false otherwise
   */
  isUserBanned(steamId: string, discordUserId?: string): Promise<boolean>;
}
