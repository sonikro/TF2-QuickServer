[![Read the Wiki – How to Use TF2-QuickServer](https://img.shields.io/badge/Wiki-How%20to%20Use%20TF2--QuickServer-blueviolet?style=for-the-badge&logo=github)](https://github.com/sonikro/TF2-QuickServer/wiki)

# 🎮 TF2-QuickServer

![TF2-QuickServer](https://img.shields.io/badge/TF2-QuickServer-blue?style=for-the-badge&logo=steam)  
[![Discord](https://img.shields.io/discord/1359667090092458055?label=Join%20Our%20Discord&logo=discord&style=for-the-badge)](https://discord.gg/HfDgMj73cW)

<!-- Logo -->
<p align="center">
  <img src="assets/logo.png" alt="TF2-QuickServer Logo" width="220" />
  <br/>
  <sub>Logo by <a href="https://www.instagram.com/thecleandesign/">kcaugolden</a></sub>
</p>


> Instantly deploy **Team Fortress 2** servers straight from Discord — powered by Docker, Oracle Cloud, and SDR.



---

## 🚀 Overview

**TF2-QuickServer** is a Discord bot that lets you spawn TF2 servers instantly in multiple regions using Oracle Container Instances. Whether you're playing competitive or just want to chill with friends, it's never been easier to get a server up and running in a few minutes.

---

## ✨ Features

- ✅ **Quick Server Deployment** – Spin up a TF2 server from scratch in 3 minutes with a simple Discord command—no technical knowledge required
- 🌍 **Global Multi-Region Support** – Deploy servers in your preferred Oracle Cloud region for the lowest possible latency
- 🛡️ **Advanced DDoS Protection** – Every server is protected by the custom-built **TF2-QuickServer-Shield**, an intelligent agent that actively monitors and blocks DDoS attacks in real time, with in-game notifications for your peace of mind
- 🛆 **Isolated Containerized Architecture** – Each server runs in its own secure Docker container, ensuring full isolation and reliability
- ⏱️ **Automatic Cost Savings** – Idle servers are automatically terminated after 10 minutes to save resources and keep costs low

---

## 🧐 How It Works

1. **Join our Discord Channel** or use the Bot in any of our Partnered Guilds
2. **Run a Command** – Example: `/create-server sa-saopaulo-1`
3. **Select a Variant** – Use the buttons shown in Discord to pick your server type (e.g., `standard-competitive`).
4. **Receive Server Info** – Get detailed connection info for your server, including SDR, direct, and TV connect addresses.
5. **Play!** – Join with friends and frag away!

---

## ⚙️ Tech Stack

- 🛠️ **Terraform** – Provisions all necessary Oracle Cloud infrastructure  
- 🧪 **OCI-SDK (Node.js)** – Dynamically creates container instances  
- 📂 **SQLite** – Fast, local database to track server and user state  
- 🐳 **Docker** – All servers are built from containerized images  
- 🦫 **GoLang** – Powers the custom TF2-QuickServer-Shield for advanced DDoS protection and network monitoring

---

## 📘 Commands

| Command | Description |
|--------|-------------|
| `/create-server <region>` | Launches a server in the selected region (you'll be prompted to select a variant) |
| `/terminate-servers` | Terminates all servers created by the user |
| `/set-user-data <steamId>` | Sets the SteamID of the user, assigning them as the Sourcemod admin for all servers the user creates |

---

## 🌎 Supported Regions

The main TF2-QuickServer app currently supports the following regions for instant server deployment:

- 🇨🇱 Santiago
- 🇧🇷 São Paulo
- 🇨🇴 Bogotá
- 🇺🇸 Chicago
- 🇩🇪 Frankfurt

If you are self-hosting, you can use **any** region that supports Oracle Container Instances.  
See the full list: [Oracle Cloud Regions](https://www.oracle.com/cloud/public-cloud-regions/)

---

## 🔧 Self-Hosting

Want to run your own version? Follow the steps below:

### 1️⃣ Clone the Repo

```bash
git clone https://github.com/sonikro/TF2-QuickServer.git
cd TF2-QuickServer
```

### 2️⃣ Configure Environment

Create a `.env` file:

```env
# Discord Bot
DISCORD_TOKEN=
DISCORD_CLIENT_ID=

# Oracle Cloud Auth
OCI_CONFIG_FILE=

# Third-party Services
DEMOS_TF_APIKEY=
LOGS_TF_APIKEY=
```

### 3️⃣ Install Dependencies

```bash
npm install
```

---

## 🗺️ Maps Setup (Fat Images)

Oracle Container Instances do **not** support NFS or shared file systems like FSS. Instead, this project uses Docker **fat images** that bake in all TF2 maps directly.

### Download maps:

```bash
npm run download:maps
```

This will create the `maps/` folder and download all maps listed in `maps.json`.

> 📝 Maps are gitignored and stored in a local `maps` folder.  
> The [mapdownloader plugin](https://github.com/spiretf/mapdownloader) is also included and will attempt to fetch missing maps dynamically if needed.

---

## ☁️ Deploy Oracle Infrastructure

Make sure you're authenticated with OCI. Then run:

```bash
npm run oracle:deploy
```

> This command runs Terraform to create required infra and generates a `config/local.json` file with all outputs.  
> TF2-QuickServer code reads this file at runtime to determine which OCI resources to use.

More info on authentication:  
📖 [OCI SDK Authentication Docs](https://docs.oracle.com/en-us/iaas/Content/API/Concepts/sdk_authentication_methods.htm)

---

## 🧪 Run the Bot

```bash
npm run dev
```

## Running with Docker Compose

```yaml
services:
  tf2-quickserver:
    image: sonikro/tf2-quickserver:latest
    restart: always
    ports:
      - 8000:3000
    env_file:
      - .env
    volumes:
      - ./db:/app/db
      - ./config:/app/config:ro
      - ./keys:/app/keys:ro
```

> Make sure you have your config files in the ./config directory

---

## 🤝 Contributing

Contributions are welcome! Open a PR, suggest improvements, or file an issue if something breaks.

---

## 📜 License

MIT

---

## 💬 Support

Need help? Want to chat with other players or devs?  
Join the [Discord](https://discord.gg/HfDgMj73cW) or open a GitHub [Issue](https://github.com/sonikro/TF2-QuickServer/issues).

---