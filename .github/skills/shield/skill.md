---
name: shield
description: "Use when writing or reviewing Go code in shield/** (the DDoS protection sidecar). Enforces the module's design — lightweight attack radar + threat-shield components, separation of detection and mitigation, table-driven tests for all *_test.go files, mocked external dependencies (firewall, RCON), graceful error handling and retries, and the Makefile targets (make test, make build, make docker-build). Do not use for TypeScript code."
---

# Shield Module (Go DDoS Protection)

The Shield module protects TF2 servers from DDoS attacks. It runs as a sidecar
container to the TF2 server and has two main components:

1. **Attack Radar** — monitors network traffic and detects potential DDoS attacks.
2. **Shield** — responds by creating firewall security rules that only allow
   traffic from players currently in the server.

## Design Principles

- Keep the module lightweight and efficient.
- Prioritize reliability and robustness in attack detection and mitigation.
- Implement proper error handling and logging for all operations.
- Minimize dependencies to reduce the attack surface.
- Maintain a clear separation between attack detection and mitigation logic.
- Follow Go best practices for package organization and naming (`pkg/` layout).
- Keep functions focused on a single responsibility.
- Use dependency injection to keep components testable.

## Components (`shield/pkg/`)

### `radar`
- Monitors network interfaces for unusual traffic patterns.
- Uses thresholds on traffic volume and duration to identify attacks.
- Calls the Shield component when an attack is detected.
- Handles edge cases: temporary traffic spikes vs. sustained attacks.

### `shield`
- Connects to the TF2 server over RCON to retrieve current player IPs.
- Configures firewall rules to allow traffic only from active players.
- Implements a timed mechanism to auto-disable protection after a duration.
- Notifies in-server players when protection is activated/deactivated.

### `srcds`
- Handles RCON communication with the TF2 server.
- Provides utilities to fetch player info and send server commands.
- Handles connection errors and retry mechanisms gracefully.

## Development Guidelines

### Testing
- All components must have comprehensive unit tests.
- **Use table-driven tests** in all `*_test.go` files.
- Mock external dependencies (firewall, RCON connections) in tests.
- Test both normal operation and error conditions.
- Simulate attack scenarios to verify detection and mitigation.

### Performance
- Minimize CPU and memory usage — the shield runs alongside the game server.
- Avoid blocking operations in critical paths.
- Use efficient algorithms for traffic analysis.
- Consider the impact of firewall rule updates on network performance.

### Deployment
- The shield is deployed as a sidecar container to the TF2 server.
- Makefile targets:
  - `make test` — run all unit tests
  - `make build` — build the shield binary
  - `make docker-build` — build the shield Docker container