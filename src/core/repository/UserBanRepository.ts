export interface UserBanRepository {
  /**
   * Checks if a user is banned by SteamID or DiscordID.
   * @param steamId3 The user's SteamID3
   * @param discordUserId The user's Discord user ID (string | undefined)
   * @returns Promise<{ isBanned: boolean, reason?: string }> - isBanned true if banned, false otherwise, and optional reason
   */
  isUserBanned(steamId3: string, discordUserId?: string): Promise<{ isBanned: boolean; reason?: string }>;
}
