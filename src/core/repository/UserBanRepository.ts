export interface UserBanRepository {
  /**
   * Checks if a user is banned by SteamID or DiscordID.
   * @param steamId The user's SteamID (string)
   * @param discordUserId The user's Discord user ID (string | undefined)
   * @returns Promise<{ isBanned: boolean, reason?: string }> - isBanned true if banned, false otherwise, and optional reason
   */
  isUserBanned(steamId: string, discordUserId?: string): Promise<{ isBanned: boolean; reason?: string }>;
}
