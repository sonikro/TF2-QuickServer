# RCON Command Blocker SourceMod Plugin

This plugin is designed to restrict RCON access, block dangerous commands, freeze sensitive cvars, and hide secret values from users. It is ideal for server managers that want to give RCON Access to users, but want users to stay away from some settings.

## Features
- **Blocklist:** Prevents execution of specific commands via RCON or console.
- **Frozen Cvars:** Allows sensitive cvars to be set only once; further changes are blocked and reverted.
- **Secret Cvars:** Prevents users from viewing the value of secret cvars (e.g., API keys, passwords) via RCON or console.
- **Self-Reloading:** If anyone attempts to unload this plugin, it will automatically reload itself and notify all online admins and the server console.

## Required Files
Place these files in `addons/sourcemod/configs/`:

### 1. `rcon_blocklist.txt`
A list of commands to block. One command per line. Example:

```
quit
sv_cheats
```

### 2. `rcon_frozen.txt`
A list of cvars that can only be set once. After initialization, any attempt to change them will be blocked and reverted. Example:

```
rcon_password
```

### 3. `secret_cvars.txt`
A list of cvars whose values should not be visible to users. Attempts to view these cvars will be blocked and an error message will be shown. Example:

```
logstf_apikey
rcon_password
```

### 4. `rcon_allowed_clients.txt`
A list of SteamIDs (one per line) who are considered fully trusted. Example:

```
STEAM_0:1:12345678
STEAM_1:0:87654321
```

If any of these SteamIDs are currently connected to the server, all blocklist and secret cvar restrictions are bypassed for everyone—including RCON and console commands. This is necessary because SourceMod does not provide a way to detect the origin SteamID for RCON/console commands (the `client` parameter is always 0 for RCON). As long as at least one allowed client is present, all commands are permitted. If no allowed client is connected, restrictions apply to everyone.

## Installation
1. Compile `rcon_blocklist.sp` with the SourceMod compiler.
2. Place the resulting `rcon_blocklist.smx` in `addons/sourcemod/plugins/`.
3. Place your config files as described above.
4. Restart your server or change the map.

## Usage Examples
- If a user tries `/rcon quit`, they will see:
  > [RCONBlock] The command 'quit' is forbidden.

- If a user tries to change a frozen cvar (e.g., `/rcon rcon_password newpass` after it was set):
  > [RCONBlock] Changing rcon_password is not allowed after it has been set.

- If a user tries `/rcon logstf_apikey` to view a secret value:
  > [RCONBlock] The value of 'logstf_apikey' is secret and cannot be visualized.

- If someone tries to unload the plugin:
  > [RCONBlock] Plugin unload detected! Re-loading rcon_blocklist...

## Notes
- Comments and blank lines are allowed in all config files (lines starting with `#` or `;`).
- All matching is case-insensitive.

## License
MIT

## Author
sonikro
