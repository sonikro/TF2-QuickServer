# Admin Commands

Creating a server makes you a Sourcemod admin and the holder of its RCON password.

## !map <map>

Change the map. For FastDL maps, use `/rcon changelevel <exact map name>`.

## !admin

Opens the Sourcemod Admin Panel — execute CFGs, change maps, manage players, and control server settings.

## /rcon exec <cfg_name>

Execute a server config, e.g. `fbtf_6v6_rules`.

## /rcon mp_tournament_restart

Restarts the competitive match while keeping players and settings.

## !addadmin <playerName> <flags>

Grant admin to a player, e.g. `!addadmin sonikro z` (Z-level is RCON-level).

## !terminate

Immediately deletes the server from in-game chat. Creator only.

## Notes

- Admin applies only to your server and resets on each new server launch.
- Misuse leads to restrictions — see [Rules and Restrictions](#rules-and-restrictions).
