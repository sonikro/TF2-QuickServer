# 🎮 TF2-QuickServer: Fat Standard Competitive Image

This is a **fat Docker image** for Team Fortress 2 competitive servers, pre-loaded with all maps and configurations needed for instant deployment. Part of the [TF2-QuickServer](https://github.com/sonikro/TF2-QuickServer) multi-cloud server deployment system.

---

## 📦 What Is This Image?

This Docker image is a **self-contained TF2 server** built on top of [melkortf/tf2-competitive](https://github.com/melkortf/tf2-servers), with the following enhancements:

- ✅ **Pre-loaded Maps** – All competitive maps (5CP, KOTH, Payload, Passtime, MGE, Dodgeball, etc.) baked directly into the image
- ✅ **Custom Plugins** – Includes MapDownloader, TF2 Dodgeball Unified, and custom Sourcemod plugins
- ✅ **Automatic Configuration** – Dynamic config generation based on map types and environment variables
- ✅ **Admin Management** – Steam-based admin system via environment variables
- ✅ **Optimized for Oracle Container Instances** – Designed for cloud environments without shared file systems

---

## 🚀 Quick Start

Pull and run the image:

```bash
docker pull sonikro/tf2-fat-standard-competitive:latest

docker run -d \
  --network=host \
  -e RCON_PASSWORD="changeme123" \
  -e SERVER_HOSTNAME="My TF2 Server" \
  -e SERVER_TOKEN="your_game_server_token" \
  -e DEMOS_TF_APIKEY="your_demos_tf_key" \
  -e LOGS_TF_APIKEY="your_logs_tf_key" \
  -e ADMIN_LIST="STEAM_1:0:12345678,STEAM_1:1:87654321" \
  -e DEFAULT_5CP_CFG="rgl_6s_5cp_scrim.cfg" \
  -e DEFAULT_KOTH_CFG="rgl_6s_koth_bo5.cfg" \
  sonikro/tf2-fat-standard-competitive:latest
```

---

## ⚙️ Environment Variables

### Base Server Configuration (from melkortf/tf2-base)

| Variable | Default | Description |
|----------|---------|-------------|
| `IP` | `0.0.0.0` | Specifies the address to use for the bind(2) syscall |
| `PORT` | `27015` | The port which the server will run on |
| `CLIENT_PORT` | `27016` | The client port |
| `STEAM_PORT` | `27018` | Master server updater port |
| `STV_PORT` | `27020` | SourceTV port |
| `SERVER_TOKEN` | *(empty)* | **Recommended** - Game server account token from [Steam Game Server Account Management](https://steamcommunity.com/dev/managegameservers) |
| `RCON_PASSWORD` | `123456` | **Change this!** - The RCON password |
| `SERVER_HOSTNAME` | `A Team Fortress 2 server` | The game server hostname |
| `SERVER_PASSWORD` | *(empty)* | The server password (leave empty for public server) |
| `STV_NAME` | `Source TV` | SourceTV host name |
| `STV_TITLE` | `A Team Fortress 2 server Source TV` | Title for the SourceTV spectator UI |
| `STV_PASSWORD` | *(empty)* | SourceTV password |
| `DOWNLOAD_URL` | `https://fastdl.serveme.tf/` | Download URL for the FastDL |
| `ENABLE_FAKE_IP` | `0` | Enables/Disables SDR (set to `1` to enable) |

### Competitive Image Configuration (from melkortf/tf2-competitive)

| Variable | Default | Description |
|----------|---------|-------------|
| `DEMOS_TF_APIKEY` | *(empty)* | **Recommended** - API key for uploading demos to [demos.tf](https://demos.tf) |
| `LOGS_TF_APIKEY` | *(empty)* | **Recommended** - API key for uploading logs to [logs.tf](https://logs.tf) |

### TF2-QuickServer Custom Variables

These environment variables are specific to TF2-QuickServer and control default configs for different map types:

| Variable | Default | Description |
|----------|---------|-------------|
| `SV_LOGSECRET` | *(empty)* | Custom logs secret value (used in conjunction with logs.tf plugin) |
| `ADMIN_LIST` | *(empty)* | Comma-separated list of Steam IDs (e.g., `STEAM_1:0:12345678`) for server admins |
| `DEFAULT_5CP_CFG` | *(empty)* | Config executed for 5CP maps (e.g., `cp_*`) |
| `DEFAULT_KOTH_CFG` | *(empty)* | Config executed for KOTH maps (e.g., `koth_*`) |
| `DEFAULT_PL_CFG` | *(empty)* | Config executed for Payload maps (e.g., `pl_*`) |
| `DEFAULT_ULTIDUO_CFG` | *(empty)* | Config executed for Ultiduo maps |
| `DEFAULT_PASSTIME_CFG` | `pt_global_pug.cfg` | Config executed for Passtime maps (e.g., `pass_*`) |
| `DEFAULT_TFDB_CFG` | `dodgeball.cfg` | Config executed for Dodgeball maps (e.g., `tfdb_*`) |
| `DEFAULT_MGE_CFG` | `mge.cfg` | Config executed for MGE maps (e.g., `mge_*`) |
| `DEFAULT_ARENA_CFG` | `tfarena_arena.cfg` | Config executed for Arena maps (e.g., `arena*`) |

---

## 📋 Per-Map Config Overrides

You can override the default config for specific maps by creating environment variables with the map name:

```bash
# Format: DEFAULT_<MAPNAME>_CFG (uppercase, dashes become underscores)
-e DEFAULT_CP_PROCESS_F12_CFG="rgl_6s_5cp_scrim.cfg"
-e DEFAULT_KOTH_PRODUCT_FINAL_CFG="rgl_hl_koth_bo5.cfg"
```

---

## 🗺️ Included Maps

This fat image includes **all maps** from the TF2-QuickServer `maps.json` manifest, covering:

- **5CP**: badlands, process, granary, gullywash, metalworks, prolands, reckoner, snakewater, sunshine, sultry, villa
- **KOTH**: product, clearcut, ashville, bagel, cascade, lakeside, warmtic, and more
- **Passtime**: arena2, boutique, colosseum2, greenhouse, pball, stadium, and more
- **MGE**: ammomod, badlands, spires, temples, viaducts, logjams
- **Dodgeball**: tfdb maps
- **Payload**: upward, badwater, swiftwater, vigil, and more

The [MapDownloader plugin](https://github.com/spiretf/mapdownloader) is also included to fetch missing maps dynamically if needed.

---

## 🛡️ Features

### 🔧 Dynamic Configuration

On startup, the image:
1. Generates `admins_simple.ini` from `ADMIN_LIST`
2. Creates a `mapcycle.txt` with all available maps
3. Generates per-map `.cfg` files based on map type or environment variables
4. Applies enforced CVARs to all configs
5. Populates admin menu with all available configs

### 🎮 Included Plugins

- **MapDownloader** – Automatically downloads missing maps from redirect servers
- **TF2 Dodgeball Unified** – Full dodgeball gameplay support (disabled by default)
- **FBTF Configs** – Latest competitive configs from fbtf.tf
- **Custom Sourcemod Plugins** – Additional TF2-QuickServer enhancements

### ⚡ Enforced CVARs

The following CVARs are automatically enforced across all configs:

```
tv_snapshotrate 33
tv_maxrate 30000
tv_deltacache 16
tv_maxclients 6
tv_delaymapchange 1
tv_delaymapchange_protect 1
tv_relayvoice 0
tv_transmitall 1
mp_idlemaxtime 45
mp_idledealmethod 2
mapcyclefile cfg/mapcycle.txt
supstats_accuracy 1
sv_logsecret "${SV_LOGSECRET}"
fps_max 1000
sv_maxrate 100000
```

---

## 🏗️ Building from Source

To build this image yourself as part of the TF2-QuickServer project:

```bash
# Download maps first
npm run download:maps

# Build the fat image
docker build -f variants/fat-standard-competitive/Dockerfile -t my-tf2-server .
```

---

## 🔗 Related Links

- 📖 [TF2-QuickServer Main Repository](https://github.com/sonikro/TF2-QuickServer)
- 📖 [TF2-QuickServer Wiki](https://github.com/sonikro/TF2-QuickServer/wiki)
- 🎮 [Join our Discord](https://discord.gg/HfDgMj73cW)
- 🐳 [Base Image: melkortf/tf2-servers](https://github.com/melkortf/tf2-servers)

---

## 📜 License

MIT
