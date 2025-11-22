import fs from "fs";
import path from "path";
import csv from "csv-parse/sync";
import { UserBanRepository } from "@tf2qs/core";
import { logger } from "@tf2qs/telemetry";

export interface UserBan {
  steam_id: string;
  discord_user_id?: string | null;
  created_at?: string | null;
  reason?: string | null;
}

export class CsvUserBanRepository implements UserBanRepository {
  private bans: UserBan[] = [];

  constructor(csvPath: string = path.join(process.cwd(), "db/bans.csv")) {
    this.loadBans(csvPath);
  }

  private loadBans(csvPath: string) {
    const fileContent = fs.readFileSync(csvPath, "utf-8");
    this.bans = csv.parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });
    
    logger.emit({
      severityText: "INFO",
      body: `Loaded ${this.bans.length} bans from CSV file`,
      attributes: {
        csvPath,
        banCount: this.bans.length
      }
    });
  }

  async isUserBanned(steamId3: string, discordUserId?: string): Promise<{ isBanned: boolean; reason?: string }> {
    const ban = this.bans.find(
      (b) =>
        b.steam_id === steamId3 ||
        (discordUserId && b.discord_user_id === discordUserId)
    );
    
    if (ban) {
      logger.emit({
        severityText: "INFO",
        body: `User is banned`,
        attributes: {
          steamId3,
          discordUserId: discordUserId || "none",
          reason: ban.reason || "no reason provided",
          bannedBy: ban.steam_id === steamId3 ? "steamId" : "discordId"
        }
      });
      return { isBanned: true, reason: ban.reason || undefined };
    }
    
    logger.emit({
      severityText: "DEBUG",
      body: `User is not banned`,
      attributes: {
        steamId3,
        discordUserId: discordUserId || "none",
        totalBansChecked: this.bans.length
      }
    });
    
    return { isBanned: false };
  }
}
