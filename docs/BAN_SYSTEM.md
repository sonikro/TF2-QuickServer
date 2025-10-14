# Ban System Documentation

## Overview

The TF2-QuickServer platform uses a CSV-based ban system that automatically prevents banned users from:
1. Creating new servers via Discord commands
2. Joining any existing QuickServer servers

## How It Works

### Ban Storage
- Bans are stored in `db/bans.csv` with the following columns:
  - `steam_id`: SteamID in U:1:XXXXXXX format
  - `discord_user_id`: Optional Discord user ID
  - `created_at`: Timestamp when the ban was created
  - `reason`: Reason for the ban

### Auto-Reload Feature
The ban list is **automatically reloaded** whenever the CSV file is modified. This means:
- ✅ No bot restart required when adding or removing bans
- ✅ Changes take effect immediately on the next ban check
- ✅ Admins can edit the CSV file while the bot is running

### When Bans Are Checked

1. **Server Creation**: When a user runs the `/create-server` Discord command
   - The user's SteamID and Discord ID are checked against the ban list
   - If banned, the server creation is blocked with an error message

2. **Player Joins Server**: When a player enters a TF2 server
   - The UDP log receiver detects when a player enters the game
   - The player's SteamID is checked against the ban list
   - If banned, the player is immediately kicked via RCON with the ban reason

## Logging

The ban system includes comprehensive logging to help troubleshoot issues:

### CSV Load Events
- `INFO`: "Loaded X bans from CSV file" - Logged when bans are loaded/reloaded
- `INFO`: "Ban CSV file has been modified, reloading bans" - Logged when auto-reload is triggered
- `ERROR`: "Failed to load bans from CSV file" - Logged if CSV parsing fails

### Ban Check Events
- `INFO`: "Checking if user is banned before creating server" - Logged before server creation ban check
- `INFO`: "User entered game, checking ban status" - Logged when player joins server
- `INFO`: "User is banned" - Logged when a banned user is detected (includes SteamID, reason, and how they were matched)
- `DEBUG`: "User is not banned" - Logged when user passes ban check
- `WARN`: "Banned user attempted to create server" / "Banned user attempted to join server" - Logged when ban is enforced

### Ban Enforcement Events
- `INFO`: "Executing ban command via RCON" - Logged before kicking a player
- `INFO`: "Successfully banned user" - Logged after successful kick
- `ERROR`: "Failed to execute ban command" - Logged if RCON command fails

## Troubleshooting

### Problem: Removed user is still getting banned

**Diagnosis Steps:**
1. Check the logs for "Loaded X bans from CSV file" to see current ban count
2. Check for "Ban CSV file has been modified, reloading bans" to confirm auto-reload is working
3. Verify the CSV file format is correct (no formatting errors)
4. Check logs for "User is banned" message to see which field matched (steamId vs discordId)

**Common Issues:**
- **Wrong SteamID format**: Ensure the SteamID is in `U:1:XXXXXXX` format
- **CSV formatting error**: Ensure proper CSV structure with no extra commas or line breaks
- **Case sensitivity**: SteamIDs are case-sensitive
- **Discord ID still present**: User might be matched by discord_user_id even if steam_id is removed

### Problem: Added user is not getting banned

**Diagnosis Steps:**
1. Verify the CSV file was saved properly
2. Check logs for "Ban CSV file has been modified, reloading bans" 
3. Check the SteamID format matches exactly what's in the game logs
4. Look for "User is not banned" DEBUG logs with the totalBansChecked count

**Common Issues:**
- **SteamID mismatch**: The SteamID format might not match between CSV and game logs
- **File not saved**: Ensure the CSV file was actually saved to disk
- **CSV parsing error**: Check for "Failed to load bans from CSV file" errors

### Problem: Bot doesn't see CSV changes

**Diagnosis Steps:**
1. Check file permissions - ensure the bot can read the CSV file
2. Verify the CSV file path is correct (default: `db/bans.csv`)
3. Look for "Failed to check CSV file modification time" errors

**Solution:**
- Ensure the bot has read access to the `db/bans.csv` file
- Check that the file system properly updates modification times

## Example Log Flow

### User Gets Banned Successfully
```
INFO: User entered game, checking ban status {userId: "6", steamId3: "U:1:123456", logSecret: "12345"}
INFO: Loaded 15 bans from CSV file {csvPath: ".../db/bans.csv", banCount: 15, lastModified: "2025-10-14T..."}
INFO: User is banned {steamId3: "U:1:123456", discordUserId: "none", reason: "Cheating", bannedBy: "steamId"}
WARN: Banned user attempted to join server {userId: "6", steamId3: "U:1:123456", banReason: "Cheating", ...}
INFO: Executing ban command via RCON {serverId: "abc-123", steamId3: "U:1:123456", userId: "6", ...}
INFO: Successfully banned user {serverId: "abc-123", steamId3: "U:1:123456", userId: "6"}
```

### Ban Removed, User Allowed In
```
INFO: Ban CSV file has been modified, reloading bans {csvPath: ".../db/bans.csv", previousModTime: "...", newModTime: "..."}
INFO: Loaded 14 bans from CSV file {csvPath: ".../db/bans.csv", banCount: 14, lastModified: "2025-10-14T..."}
INFO: User entered game, checking ban status {userId: "6", steamId3: "U:1:123456", logSecret: "12345"}
DEBUG: User is not banned {steamId3: "U:1:123456", discordUserId: "none", totalBansChecked: 14}
```

## Best Practices

1. **Always use the correct SteamID format**: `U:1:XXXXXXX`
2. **Include a descriptive reason**: Helps with record keeping and player communication
3. **Monitor logs after changes**: Check logs to confirm bans were reloaded
4. **Keep backups**: Save a copy of bans.csv before making bulk changes
5. **Use consistent formatting**: Keep the CSV properly formatted to avoid parsing errors
