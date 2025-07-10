import fs from "fs";
import path from "path";
import csv from "csv-parse/sync";
import { UserBanRepository } from "../../core/repository/UserBanRepository";

export interface UserBan {
  steam_id: string;
  discord_user_id?: string | null;
  created_at?: string | null;
  reason?: string | null;
}

export class CsvUserBanRepository implements UserBanRepository {
  private bans: UserBan[] = [];

  constructor(csvPath: string = path.join(__dirname, "../../../db/bans.csv")) {
    this.loadBans(csvPath);
  }

  private loadBans(csvPath: string) {
    const fileContent = fs.readFileSync(csvPath, "utf-8");
    this.bans = csv.parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });
  }

  async isUserBanned(steamId3: string, discordUserId?: string): Promise<{ isBanned: boolean; reason?: string }> {
    const ban = this.bans.find(
      (b) =>
        b.steam_id === steamId3 ||
        (discordUserId && b.discord_user_id === discordUserId)
    );
    if (ban) {
      return { isBanned: true, reason: ban.reason || undefined };
    }
    return { isBanned: false };
  }
}
