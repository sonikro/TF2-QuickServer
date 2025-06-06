# TF2 QuickServer Shield

TF2 QuickServer Shield is a lightweight binary that monitors network traffic on a game server and detects attacks (e.g., DDoS). When an attack is detected, it manipulates Oracle NSG firewall rules to drop new connections, keeping only current players protected.

**Note:** This project is in active development.

## Features
- Monitors network interface traffic in real time
- Detects attacks based on configurable thresholds
- Updates Oracle NSG firewall rules to protect active players

## Usage
1. **Build:**
   ```sh
   make build
   ```
2. **Run:**
   Example:
   ```sh
   ./bin/shield
   ```

## How it works
- Polls the network interface for received bytes.
- If traffic exceeds the threshold for more than 3 seconds, triggers the handler.
- The handler updates Oracle NSG rules to block new connections, allowing only current players.

## Environment Variables

The following environment variables are required for Shield to connect to the Source Dedicated Server (SRCDS) and configure its operation:

- `SRCDS_IP`: The IP address of the SRCDS server. Defaults to `127.0.0.1` if not set.
- `SRCDS_PORT`: The port of the SRCDS server. Defaults to `27015` if not set.
- `SRCDS_PASSWORD`: The RCON password for the SRCDS server. **This must be set.**
- `IFACE`: Network interface to monitor (if not set, defaults to the first non-loopback interface).
- `MAXBYTES`: Max bytes/sec before triggering protection (default: `100000000`). Traffic must exceed this value for more than 3 seconds to be considered an attack.
- `NSG_NAME`: The name of the Oracle Network Security Group (NSG) to update. Required for automatic firewall management.

If any of these variables are missing (except for IP, port, IFACE, and MAXBYTES, which have defaults), Shield will not start.

