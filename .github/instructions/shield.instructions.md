# Shield Module Instructions

## Overview
The Shield module is a critical security component that protects TF2 servers from DDoS attacks. It works as a sidecar to the TF2 Server and consists of two main components:
1. **Attack Radar**: Monitors network traffic and detects potential DDoS attacks
2. **Shield**: Responds to attacks by creating security rules that only allow traffic from players currently in the server

## Design Principles

### General Guidelines
- Keep the shield module lightweight and efficient
- Prioritize reliability and robustness in attack detection and mitigation
- Implement proper error handling and logging for all operations
- Minimize dependencies to reduce attack surface

### Code Structure
- Maintain clear separation between attack detection and mitigation logic
- Follow Go best practices for package organization and naming
- Keep functions focused on a single responsibility
- Use dependency injection to make components testable

## Components

### Attack Radar (`pkg/radar`)
- Monitors network interfaces for unusual traffic patterns
- Uses thresholds for both traffic volume and duration to identify attacks
- Calls the Shield component when an attack is detected
- Should handle edge cases like temporary traffic spikes vs. sustained attacks

### Shield (`pkg/shield`)
- Connects to TF2 server via RCON to retrieve current player IPs
- Configures firewall rules to only allow traffic from active players
- Implements timed mechanism to automatically disable protection after a specified duration
- Notifies players in the server when protection is activated/deactivated

### SRCDS Integration (`pkg/srcds`)
- Handles communication with the TF2 server via RCON protocol
- Provides utilities to fetch player information and send server commands
- Must handle connection errors and retry mechanisms gracefully

## Development Guidelines

### Testing
- All components must have comprehensive unit tests
- **Use table-driven tests** for all test files (`*_test.go`)
- Mock external dependencies (firewall, RCON connections) in tests
- Test both normal operation and error conditions
- Simulate attack scenarios in tests to verify detection and mitigation

### Performance Considerations
- Minimize CPU and memory usage as the shield runs alongside the game server
- Avoid blocking operations in critical paths
- Use efficient algorithms for traffic analysis
- Consider the impact of firewall rule updates on network performance

### Deployment
- The shield component is deployed as a sidecar container to the TF2 server
- Use the provided Makefile targets for building and testing:
  - `make test`: Run all unit tests
  - `make build`: Build the shield binary
  - `make docker-build`: Build the shield Docker container

