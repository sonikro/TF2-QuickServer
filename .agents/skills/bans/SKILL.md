---
name: bans
description: "Use when editing db/bans.csv to ban or unban players on the TF2-QuickServer platform. Enforces the CSV schema (steam_id, discord_user_id, created_at, reason), the U:1:XXXXXXX Steam ID format, the YYYY-MM-DD HH:MM:SS timestamp format for created_at, preserving exactly 3 commas per line, and post-edit CSV validation. Service restart path — the release workflow ships the updated file to deployed servers."
---

# Banned Players (db/bans.csv)

`db/bans.csv` is critical to the platform's security and moderation. It lists
every Steam ID banned from creating or joining servers on the platform.

## File Location

- `db/bans.csv`

## File Format

CSV with four columns, exactly 3 commas per line even when fields are empty:

1. `steam_id` — Steam ID in `U:1:XXXXXXX` format
2. `discord_user_id` — associated Discord user ID (may be empty)
3. `created_at` — ban timestamp in `YYYY-MM-DD HH:MM:SS`
4. `reason` — the reason for the ban

## Adding a Ban

1. Confirm the player's Steam ID is `U:1:XXXXXXX` (no other format is supported).
2. Append a row:

```
U:1:123456789,,2025-09-18 15:30:00,Cheating in competitive match
```

## Removing a Ban

1. Find the row by Steam ID in `bans.csv`.
2. Delete that entire row.

## Guidelines

- Always maintain the CSV structure: exactly 3 commas per line per entry, even
  with empty `discord_user_id`.
- Steam ID must be `U:1:XXXXXXX`; nothing else is accepted.
- `created_at` must be `YYYY-MM-DD HH:MM:SS`.
- Always include a clear reason for transparency.
- After editing, verify the CSV structure is intact to prevent parsing errors
  (the CI/release workflow ships this file to all deployed servers).

## Troubleshooting

If a ban is not taking effect:

1. Verify the Steam ID format is correct.
2. Ensure the CSV has no formatting errors.
3. Confirm the service restarted / the updated ban list was loaded (the release
   workflow copies `db/bans.csv` onto deployed servers).
4. Verify file permissions allow the service to read `bans.csv`.