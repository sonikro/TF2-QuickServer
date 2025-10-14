import fs from "fs";
import path from "path";
import csv from "csv-parse/sync";
import { UserBanRepository } from "../../core/repository/UserBanRepository";
import { logger } from "../../telemetry/otel";

export interface UserBan {
  steam_id: string;
  discord_user_id?: string | null;
  created_at?: string | null;
  reason?: string | null;
}

export class CsvUserBanRepository implements UserBanRepository {
  private bans: UserBan[] = [];
  private csvPath: string;
  private lastModifiedTime: number = 0;

  constructor(csvPath: string = path.join(__dirname, "../../../db/bans.csv")) {
    this.csvPath = csvPath;
    this.loadBans();
  }

  private loadBans() {
    try {
      const fileContent = fs.readFileSync(this.csvPath, "utf-8");
      const stats = fs.statSync(this.csvPath);
      this.lastModifiedTime = stats.mtimeMs;
      
      this.bans = csv.parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });
      
      logger.emit({
        severityText: "INFO",
        body: `Loaded ${this.bans.length} bans from CSV file`,
        attributes: {
          csvPath: this.csvPath,
          banCount: this.bans.length,
          lastModified: new Date(this.lastModifiedTime).toISOString()
        }
      });
    } catch (error) {
      logger.emit({
        severityText: "ERROR",
        body: `Failed to load bans from CSV file: ${error instanceof Error ? error.message : String(error)}`,
        attributes: {
          csvPath: this.csvPath,
          error: JSON.stringify(error, Object.getOwnPropertyNames(error))
        }
      });
      this.bans = [];
    }
  }

  private checkAndReloadIfModified() {
    try {
      const stats = fs.statSync(this.csvPath);
      if (stats.mtimeMs > this.lastModifiedTime) {
        logger.emit({
          severityText: "INFO",
          body: "Ban CSV file has been modified, reloading bans",
          attributes: {
            csvPath: this.csvPath,
            previousModTime: new Date(this.lastModifiedTime).toISOString(),
            newModTime: new Date(stats.mtimeMs).toISOString()
          }
        });
        this.loadBans();
      }
    } catch (error) {
      logger.emit({
        severityText: "ERROR",
        body: `Failed to check CSV file modification time: ${error instanceof Error ? error.message : String(error)}`,
        attributes: {
          csvPath: this.csvPath,
          error: JSON.stringify(error, Object.getOwnPropertyNames(error))
        }
      });
    }
  }

  async isUserBanned(steamId3: string, discordUserId?: string): Promise<{ isBanned: boolean; reason?: string }> {
    // Check if CSV has been modified and reload if necessary
    this.checkAndReloadIfModified();
    
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
