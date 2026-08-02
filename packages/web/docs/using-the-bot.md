# Using the Bot

## Join the Discord Guild

Join the guild at [discord.gg/HfDgMj73cW](https://discord.gg/HfDgMj73cW) — this is the hub for all TF2-QuickServer activity.

## Commands

- `/set-user-data <steamId>`
- `/create-server <region>`
- `/get-guild-servers`
- `/get-my-servers`
- `/status`
- `/terminate-servers`
- `/schedule`, `/show-schedules`, and `/cancel-schedule` are covered on the [Scheduling](#scheduling) page.

## /set-user-data <steamId>

Register your Steam ID once to use the bot. Format: `STEAM_0_000000`. You can find your Steam ID on [steamid.io](https://steamid.io/). Registering grants you Sourcemod admin on the servers you create.

## /create-server <region>

Choose a region; the bot then prompts you for a Variant (which varies by guild). You must register your Steam ID first. Creating a server takes about 3 minutes, after which the bot replies with the Connection IP, RCON Password, and SourceTV link.

## /get-my-servers

No parameters. Shows Connection IP/Port, Server Password, RCON Address/Password, SourceTV IP/Password, and Status (ready/pending/terminating). The reply is ephemeral, and details are only shown for "ready" servers.

## /status

No parameters. Shows a table of region names with counts: running (✅ ready), creating (⏳ pending), terminating (🔴). The reply is ephemeral.

## /terminate-servers

Manually deletes your servers. Servers are also auto-deleted after 10 minutes empty, but manual termination is recommended.

## /get-guild-servers

Requires the Administrator permission. Shows a table: Server ID (truncated), Region, Connection IP/Port, SourceTV IP/Port, Server Password, SourceTV Password, RCON Password. Only "ready" servers are listed, and the reply is ephemeral.

## Scheduling Servers

Want a server ready at a specific time? See [Scheduling](#scheduling) for `/schedule`, `/show-schedules`, and `/cancel-schedule`.
