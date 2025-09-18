# Banned Players Management Instructions

## Overview
The `bans.csv` file is a critical component of the TF2-QuickServer platform's security and moderation system. It contains a list of all Steam IDs that are banned from creating or joining any servers within the QuickServer platform.

## File Location
- Path: `db/bans.csv`

## File Format
The file uses CSV (Comma-Separated Values) format with the following columns:

1. **steam_id** - The Steam ID of the banned player in the format `U:1:XXXXXXX`
2. **discord_user_id** - The Discord user ID associated with the ban (can be empty)
3. **created_at** - The date and time when the ban was created (YYYY-MM-DD HH:MM:SS format)
4. **reason** - The reason for the ban

## Usage Guidelines

### Adding a New Ban

To ban a player from the TF2-QuickServer platform:

1. Identify the player's Steam ID in the correct format (`U:1:XXXXXXX`)
2. Add a new row to `bans.csv` with the following information:
   - steam_id: The player's Steam ID
   - discord_user_id: The player's Discord ID if available, or empty if not
   - created_at: Current date and time in the format YYYY-MM-DD HH:MM:SS
   - reason: A clear and concise reason for the ban

Example:
```
U:1:123456789,,2025-09-18 15:30:00,Cheating in competitive match
```

### Removing a Ban

To unban a player:

1. Locate the player's entry in the `bans.csv` file by searching for their Steam ID
2. Delete the entire row corresponding to that player

### Important Guidelines

- **Always maintain the CSV format**: Ensure there are exactly 3 commas per line, even if some fields are empty
- **SteamID format**: Must be in the format `U:1:XXXXXXX` (no other formats are supported)
- **Date format**: Must follow YYYY-MM-DD HH:MM:SS format
- **Verification**: After editing the file, verify that the CSV structure is intact to prevent parsing errors
- **Reason documentation**: Always include a clear reason for the ban to maintain transparency

## Implementation Details

The `bans.csv` file is used by the TF2-QuickServer platform to:

1. Prevent banned users from creating new servers
2. Prevent banned users from joining any existing QuickServer servers
3. Automatically kick banned users if they attempt to join a server

## Example Entries

```
U:1:413588,,2025-06-21 23:18:58,Banned from FBTF
U:1:129475268,,2025-06-21 23:19:05,Banned from FBTF
U:1:1203729799,,2025-06-21 23:20:36,Banned for griefing
```

## Troubleshooting

If a ban is not taking effect:

1. Verify the Steam ID format is correct
2. Ensure the CSV file has no formatting errors
3. Check that the platform services have been restarted to load the updated ban list
4. Verify file permissions allow the service to read the bans file
