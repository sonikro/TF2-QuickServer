---
name: server-config
description: "Use when working on TF2 server configuration and packaging — variants/** (Dockerfiles, tf/cfg, SourceMod plugins), maps.json, maps.casual.json, or the enforced_cvars.cfg entrypoint processing. Covers map list management and download commands, the variants/base layout, the five fat Docker images, and the canonical Valve TF2 server references. Do not use for code in packages/ or src/."
---

# TF2 Server Configuration & Fat Images

All server configuration is managed as Docker files under `variants/`, and map
availability is controlled by two JSON files at the repo root.

## Maps Management

- `maps.json` defines maps for competitive variants (5CP, KOTH, Payload,
  Ultiduo, Passtime, MGE, Dodgeball, Arena).
- `maps.casual.json` defines casual/pub-style maps (Payload, Control Points,
  KOTH).
- Download maps with `npm run download:maps` (reads `maps.json`) or
  `npm run download:maps:casual` (reads `maps.casual.json`).
- The CI workflow (`build-variant.yaml`) picks the file by variant name: if it
  contains "casual" it uses `maps.casual.json`, otherwise `maps.json`.
- Maps have two formats:
  - Simple string — the map name; downloaded from serveme.tf FastDL
    (e.g. `"cp_process_f12"`).
  - Object — `{ "name": "...", "url": "..." }` for a custom download URL.

```json
[
  "cp_process_f12",
  { "name": "koth_berry_b3a", "url": "https://tf2maps.net/downloads/borgville.19389/download" }
]
```

## Server Configuration Structure

- Shared addons/configs/plugins live in `variants/base/tf`; files here are
  copied into every Docker image at build time.
- `.cfg` files: `variants/base/tf/cfg`
- SourceMod plugins (`.smx`): `variants/base/tf/addons/sourcemod/plugins`
- The container's custom entrypoint readies the server; `variants/base` holds
  `entrypoint.sh`, `custom_entrypoint.sh`, `root_entrypoint.sh`,
  `install_tf2.sh`, `enforced_cvars.cfg`, `healthcheck.sh`, and `rcon/`.

## Enforced CVars

- `variants/base/enforced_cvars.cfg` holds CVars applied to **all** server
  configurations by the container entrypoint.
- These override conflicting values in other CFG files — use with caution as
  they affect every variant.

## Docker Images (variants)

The repository builds a set of "fat" images (maps baked in, since OCI Container
Instances do not support shared filesystems):

1. `standard-competitive-i386` — all `maps.json` maps; competitive plugins
   (SOAP-TF2DM, MGEMod, TF2 Comp Fixes, F2's SourceMod plugins, ETF2L/RGL/
   Ultitrio configs); primary image for competitive servers.
2. `casual-i386` — `maps.casual.json` maps; lighter plugin set (no SOAP-TF2DM,
   MGEMod, or ETF2L/RGL configs); default map `pl_badwater`, 24 max players.
3. `tf2pickup` — specialized for pickup game variants.
4. `tf2center` — tailored for TF2Center (pickup/league platform) integration.
5. `mge-tf` — specialized for MGE training/duel servers.

Build/push via `npm run build:fat:<variant>` / `npm run push:fat:<variant>`.

## Reference Documentation

Official Valve docs for TF2 dedicated servers (consult when setting CVars,
plugins, or server behavior):

- [Linux dedicated server](https://wiki.teamfortress.com/wiki/Linux_dedicated_server)
- [Dedicated server configuration](https://wiki.teamfortress.com/wiki/Dedicated_server_configuration)
- [SteamCMD](https://developer.valvesoftware.com/wiki/SteamCMD)
- [SRCDS command line options](https://developer.valvesoftware.com/wiki/Command_line_options)
- [Source Dedicated Server (SRCDS)](https://developer.valvesoftware.com/wiki/Source_Dedicated_Server)
- [Source RCON Protocol](https://developer.valvesoftware.com/wiki/Source_RCON_Protocol)
- [List of TF2 console commands and variables](https://developer.valvesoftware.com/wiki/List_of_Team_Fortress_2_console_commands_and_variables)

The base image is `ghcr.io/melkortf/tf2-competitive`; its Dockerfile lives at
https://github.com/melkortf/tf2-servers/blob/master/packages/tf2-competitive/Dockerfile
and explains the underlying server image structure.