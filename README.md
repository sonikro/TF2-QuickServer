# TF2-QuickServer

> For a simpler approach to TF2 servers on Oracle Cloud, see the [Terraform Module](https://github.com/sonikro/terraform-oracle-tf2-server).

[![Read the Wiki – How to Use TF2-QuickServer](https://img.shields.io/badge/Wiki-How%20to%20Use%20TF2--QuickServer-blueviolet?style=for-the-badge&logo=github)](https://github.com/sonikro/TF2-QuickServer/wiki)

[![Discord](https://img.shields.io/discord/1359667090092458055?label=Join%20Our%20Discord&logo=discord&style=for-the-badge)](https://discord.gg/HfDgMj73cW)
[![Better Stack Badge](https://uptime.betterstack.com/status-badges/v1/monitor/21jog.svg)](https://status.sonikro.com/)


<p align="center">
  <img src="assets/logo.png" alt="TF2-QuickServer Logo" width="220" />
  <br/>
  <sub>Logo by <a href="https://www.instagram.com/thecleandesign/">kcaugolden</a></sub>
</p>

Deploy Team Fortress 2 servers directly from Discord using Docker and multi-cloud infrastructure (Oracle Cloud and AWS).



---

## Overview

TF2-QuickServer is a Discord bot that spawns TF2 servers across multiple regions. It uses Oracle Container Instances for most regions and AWS Local Zones for ultra-low latency in select locations. Servers are up and running within minutes.

---

## Features

- **Quick Server Deployment** – Spin up a TF2 server in 3 minutes with a simple Discord command
- **Multi-Cloud Global Deployment** – Deploy across Oracle Cloud regions and AWS Local Zones for low latency
- **DDoS Protection** – TF2-QuickServer-Shield monitors and blocks attacks in real time with in-game notifications
- **Containerized Architecture** – Each server runs in an isolated Docker container
- **Automatic Cost Savings** – Idle servers terminate after 10 minutes

---

## How It Works

1. Join our Discord or use the bot in a partnered guild
2. Run `/create-server <region>`
3. Select a variant (e.g., `standard-competitive`)
4. Receive connection info (SDR, direct, and TV addresses)
5. Connect and play

---

## Supported Regions

The main TF2-QuickServer app currently supports the following regions for server deployment:

### Oracle Cloud Infrastructure (OCI)
- 🇨🇱 Santiago
- 🇧🇷 São Paulo
- 🇨🇴 Bogotá
- 🇺🇸 Chicago
- 🇩🇪 Frankfurt
- 🇦🇺 Sydney

### AWS Local Zones
- 🇦🇷 **Buenos Aires (Experimental)**
- 🇵🇪 **Lima (Experimental)**

If you are self-hosting, you can use **any** region that supports Oracle Container Instances or AWS ECS in Local Zones.  
See the full lists: [Oracle Cloud Regions](https://www.oracle.com/cloud/public-cloud-regions/) | [AWS Local Zones](https://aws.amazon.com/about-aws/global-infrastructure/localzones/)

---

## Commands

| Command | Description |
|--------|-------------|
| `/create-server <region>` | Launches a server in the selected region (you'll be prompted to select a variant) |
| `/get-my-servers` | Retrieves all your active server details (IPs, passwords, etc.) in case you lost the original message |
| `/status` | Shows the current status of all servers across all regions (running, pending, terminating counts) |
| `/terminate-servers` | Terminates all servers created by the user |
| `/set-user-data <steamId>` | Sets the SteamID of the user, assigning them as the Sourcemod admin for all servers the user creates |

---

## Self-Hosting

Want to run your own version? Follow the steps below:

### 1. Clone the Repo

```bash
git clone https://github.com/sonikro/TF2-QuickServer.git
cd TF2-QuickServer
```

### 2. Configure Environment

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

### 3. Install Dependencies

```bash
npm install
```

---

## Maps Setup (Fat Images)

Oracle Container Instances do **not** support NFS or shared file systems like FSS. Instead, this project uses Docker **fat images** that bake in all TF2 maps directly.

### Download maps:

```bash
npm run download:maps
```

This will create the `maps/` folder and download all maps listed in `maps.json`.

> Maps are gitignored and stored in a local `maps` folder.
> The [mapdownloader plugin](https://github.com/spiretf/mapdownloader) is also included and will attempt to fetch missing maps dynamically if needed.

---

## Deploy Multi-Cloud Infrastructure

Make sure you're authenticated with both OCI and AWS (if using Local Zones). Then run:

```bash
npm run terraform:deploy
```

> This command runs Terraform to create required infrastructure across Oracle Cloud and AWS, and generates a `config/local.json` file with all outputs.
> TF2-QuickServer code reads this file at runtime to determine which cloud resources to use.

Authentication info:
- [OCI SDK Authentication Docs](https://docs.oracle.com/en-us/iaas/Content/API/Concepts/sdk_authentication_methods.htm)
- [AWS CLI Authentication Docs](https://docs.aws.amazon.com/cli/latest/userguide/cli-authentication-user.html)

---

## Run the Bot

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


## Observability and OpenTelemetry


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

## Contributing

Contributions are welcome. Open a PR, suggest improvements, or file an issue.

---

## License

MIT

---

## Support

Need help? Join the [Discord](https://discord.gg/HfDgMj73cW) or open a GitHub [Issue](https://github.com/sonikro/TF2-QuickServer/issues).

---