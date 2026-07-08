---
applyTo: "variants/**/*"
---

# Copilot Instructions for TF2 Server Configuration

## Overview

This project manages Team Fortress 2 server configurations through Docker images with different variants and configurations. All server configuration is handled through files in the `variants` directory, and map availability is controlled by two files in the repository root:
- `maps.json` — competitive/custom maps (5CP, KOTH, Payload, Ultiduo, Passtime, MGE, Dodgeball, Arena)
- `maps.casual.json` — casual/pub-style maps (Payload, Control Points, KOTH)

## Maps Management

- The `maps.json` file in the repository root defines all maps for competitive server variants (5CP, KOTH, Payload, Ultiduo, Passtime, MGE, Dodgeball, Arena, etc.)
- The `maps.casual.json` file in the repository root defines maps for the casual server variant (standard Valve pub-style maps: Payload, Control Points, KOTH)
- Maps are downloaded via the `npm run download:maps` command (reads `maps.json`) or `npm run download:maps:casual` (reads `maps.casual.json`)
- The CI workflow (`build-variant.yaml`) automatically selects the correct maps file based on the variant name — if it contains "casual", it uses `maps.casual.json`, otherwise it uses `maps.json`
- Maps can be specified in two formats:
  - Simple string format: Just the map name (e.g., `"cp_process_f12"`) will download from serveme.tf fastDL
  - Object format: With `name` and `url` properties to specify a custom download URL

Example map entry in `maps.json` (competitive):
```json
[
    "cp_process_f12",
    {
        "name": "koth_berry_b3a",
        "url": "https://tf2maps.net/downloads/borgville.19389/download"
    }
]
```

Example map entry in `maps.casual.json` (casual):
```json
[
    "pl_badwater",
    "pl_upward",
    "cp_badlands",
    "koth_viaduct"
]
```

## Server Configuration Structure

- All addons, configuration files, and plugins are stored in the `variants/base/tf` folder
- Files in this folder are automatically copied to all Docker images during build
- Configuration files (`.cfg`) are located in `variants/base/tf/cfg`
- SourceMod plugins (`.smx`) are stored in `variants/base/tf/addons/sourcemod/plugins`

## Docker Images

This repository generates five different Docker images:

1. **sonikro/fat-tf2-standard-competitive-i386:latest**
   - Includes all maps specified in `maps.json`
   - 32-bit image deployed for the majority of competitive servers
   - Contains competitive plugins: SOAP-TF2DM, MGEMod, TF2 Comp Fixes, F2's SourceMod plugins, ETF2L configs, RGL configs, Ultitrio configs

2. **sonikro/fat-tf2-casual-i386:latest**
   - Uses `maps.casual.json` for a curated set of casual/pub-style maps (Payload, Control Points, KOTH)
   - 32-bit image for casual gameplay servers
   - Lighter plugin set compared to competitive (no SOAP-TF2DM, MGEMod, ETF2L/RGL configs)
   - Includes TF2 Comp Fixes and F2's SourceMod plugins
   - Default map: `pl_badwater` with 24 max players

3. **sonikro/fat-tf2-pickup:latest**
   - Specialized image used only for pickup game variants
   - Contains additional plugins specific to pickup games

4. **sonikro/fat-tf2center:latest**
   - Image tailored for TF2Center (pickup/league platform) integration

5. **sonikro/fat-mge-tf:latest**
   - Specialized image for MGE (My Gaming Edge) training/duel servers

## Enforced CVars

- The `variants/base/enforced_cvars.cfg` file contains server CVars that should be applied to all configurations
- This file is processed by the container's custom entrypoint script
- These values will override any conflicting values in other CFG files on the server
- Use this file with caution, as it affects all server variants

Example of enforced CVars:
```
tv_snapshotrate 33
tv_maxrate 30000
mp_idlemaxtime 45
```

## Reference Documentation

When managing Team Fortress 2 source dedicated servers and commands, refer to these official resources:

### Official Valve Documentation – TF2 Dedicated Servers

- [Linux dedicated server](https://wiki.teamfortress.com/wiki/Linux_dedicated_server)  
  Guide to setting up a TF2 dedicated server on **Linux** (also FreeBSD via compatibility).

- [Dedicated server configuration](https://wiki.teamfortress.com/wiki/Dedicated_server_configuration)  
  General configuration: `server.cfg`, maplist, MOTD, command-line options, VAC/cheat prevention.

- [SteamCMD](https://developer.valvesoftware.com/wiki/SteamCMD)  
  Official Valve instructions for installing/updating dedicated servers.

- [Command line options](https://developer.valvesoftware.com/wiki/Command_line_options)  
  List of command-line arguments for the Source Dedicated Server (SRCDS).

- [Source Dedicated Server (SRCDS)](https://developer.valvesoftware.com/wiki/Source_Dedicated_Server)  
  Overview of SRCDS installation, configuration, and running dedicated servers.

- [Source RCON Protocol](https://developer.valvesoftware.com/wiki/Source_RCON_Protocol)  
  Documentation of the remote console protocol for controlling SRCDS servers.

- [List of TF2 console commands and variables](https://developer.valvesoftware.com/wiki/List_of_Team_Fortress_2_console_commands_and_variables)  
  Complete list of console commands and cvars available in TF2.

### Base Image for TF2 Servers

The base image is ghcr.io/melkortf/tf2-competitive and the Dockerfile for that image is available at https://github.com/melkortf/tf2-servers/blob/master/packages/tf2-competitive/Dockerfile. Use this when trying to understand the underlying structure and configuration of the TF2 server images.