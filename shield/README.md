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
   ```sh
   ./bin/shield
   ```
   - `IFACE`: Network interface (default: `eth0`)
   - `MAXBYTES`: Max bytes/sec before triggering protection (default: `100000000`)

   Example:
   ```sh
   IFACE=eth0 MAXBYTES=50000000 ./bin/shield
   ```

## How it works
- Polls the network interface for received bytes.
- If traffic exceeds the threshold, triggers the handler.
- The handler updates Oracle NSG rules to block new connections, allowing only current players.
