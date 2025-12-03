# 🎮 TF2-QuickServer

> Looking for a simpler way to create TF2 servers on Oracle Cloud? Check out the [Terraform Module](https://github.com/sonikro/terraform-oracle-tf2-server) — it provides an easy way to spin up servers without the Discord bot complexity.

[![Read the Wiki – How to Use TF2-QuickServer](https://img.shields.io/badge/Wiki-How%20to%20Use%20TF2--QuickServer-blueviolet?style=for-the-badge&logo=github)](https://github.com/sonikro/TF2-QuickServer/wiki)

[![Discord](https://img.shields.io/discord/1359667090092458055?label=Join%20Our%20Discord&logo=discord&style=for-the-badge)](https://discord.gg/HfDgMj73cW)
[![Better Stack Badge](https://uptime.betterstack.com/status-badges/v1/monitor/21jog.svg)](https://status.sonikro.com/)


<!-- Logo -->
<p align="center">
  <img src="assets/logo.png" alt="TF2-QuickServer Logo" width="220" />
  <br/>
  <sub>Logo by <a href="https://www.instagram.com/thecleandesign/">kcaugolden</a></sub>
</p>


> Instantly deploy **Team Fortress 2** servers straight from Discord — powered by Docker, multi-cloud architecture (Oracle Cloud & AWS), and SDR.



---

## 🚀 Overview

**TF2-QuickServer** is a Discord bot that lets you spawn TF2 servers instantly in multiple regions using a multi-cloud architecture. Deploy servers on Oracle Container Instances for most regions, or AWS Local Zones for ultra-low latency in specific locations like Buenos Aires. Whether you're playing competitive or just want to chill with friends, it's never been easier to get a server up and running in a few minutes.

---

## ✨ Features

- ✅ **Quick Server Deployment** – Spin up a TF2 server from scratch in 3 minutes with a simple Discord command—no technical knowledge required
- 🌍 **Multi-Cloud Global Deployment** – Deploy servers across Oracle Cloud regions worldwide, plus AWS Local Zones for ultra-low latency in select cities like Buenos Aires
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

- 🛠️ **Terraform** – Provisions all necessary cloud infrastructure across Oracle Cloud and AWS
- 🧪 **Multi-Cloud SDKs** – OCI-SDK (Node.js) for Oracle Cloud Container Instances, AWS SDK for ECS deployments in Local Zones
- 📂 **SQLite** – Fast, local database to track server and user state  
- 🐳 **Docker** – All servers are built from containerized images  
- 🦫 **GoLang** – Powers the custom TF2-QuickServer-Shield for advanced DDoS protection and network monitoring

---

## 📘 Commands

| Command | Description |
|--------|-------------|
| `/create-server <region>` | Launches a server in the selected region (you'll be prompted to select a variant) |
| `/get-my-servers` | Retrieves all your active server details (IPs, passwords, etc.) in case you lost the original message |
| `/status` | Shows the current status of all servers across all regions (running, pending, terminating counts) |
| `/terminate-servers` | Terminates all servers created by the user |
| `/set-user-data <steamId>` | Sets the SteamID of the user, assigning them as the Sourcemod admin for all servers the user creates |

---

## 🌎 Supported Regions

The main TF2-QuickServer app currently supports the following regions for instant server deployment:

### Oracle Cloud Infrastructure (OCI)
- 🇨🇱 Santiago
- 🇧🇷 São Paulo
- 🇨🇴 Bogotá
- 🇺🇸 Chicago
- 🇩🇪 Frankfurt
- 🇦🇺 Sydney

### AWS Local Zones
- 🇦🇷 **Buenos Aires (Experimental)** – Ultra-low latency deployment using AWS Local Zone
- 🇵🇪 **Lima (Experimental)** – Ultra-low latency deployment using AWS Local Zone

If you are self-hosting, you can use **any** region that supports Oracle Container Instances or AWS ECS in Local Zones.  
See the full lists: [Oracle Cloud Regions](https://www.oracle.com/cloud/public-cloud-regions/) | [AWS Local Zones](https://aws.amazon.com/about-aws/global-infrastructure/localzones/)

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

# Oracle Cloud Auth (required for OCI regions)
OCI_CONFIG_FILE=

# AWS Auth (required for AWS Local Zone regions)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=

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

## ☁️ Deploy Multi-Cloud Infrastructure

Make sure you're authenticated with both OCI and AWS (if using Local Zones). Then run:

```bash
npm run terraform:deploy
```

> This command runs Terraform to create required infrastructure across Oracle Cloud and AWS, and generates a `config/local.json` file with all outputs.  
> TF2-QuickServer code reads this file at runtime to determine which cloud resources to use.

Authentication info:  
📖 [OCI SDK Authentication Docs](https://docs.oracle.com/en-us/iaas/Content/API/Concepts/sdk_authentication_methods.htm)  
📖 [AWS CLI Authentication Docs](https://docs.aws.amazon.com/cli/latest/userguide/cli-authentication-user.html)

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


## 📈 Observability & OpenTelemetry


**TF2-QuickServer** is instrumented for full observability using [OpenTelemetry](https://opentelemetry.io/). This enables you to collect **traces**, **metrics**, and **logs** from the bot and supporting services, making it easy to monitor performance, troubleshoot issues, and gain insights into server operations.

If the environment variable `NEW_RELIC_LICENSE_KEY` is set, a New Relic agent (`newrelic-infra` sidecar container) will automatically run on each Oracle server instance for enhanced infrastructure monitoring and reporting to New Relic.

To enable OpenTelemetry data export from the Discord App, set the following environment variables in your `.env` file or deployment configuration:

```env
# OpenTelemetry Exporter Configuration
OTEL_SERVICE_NAME=tf2-quickserver
OTEL_RESOURCE_ATTRIBUTES=service.environment=localhost
OTEL_EXPORTER_OTLP_ENDPOINT=
OTEL_EXPORTER_OTLP_HEADERS=api-key=
OTEL_ATTRIBUTE_VALUE_LENGTH_LIMIT=
OTEL_EXPORTER_OTLP_COMPRESSION=gzip
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
OTEL_EXPORTER_OTLP_METRICS_TEMPORALITY_PREFERENCE=delta
```

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