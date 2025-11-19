# TF2-QuickServer Copilot Instructions Index

This file serves as an index for all project-specific instructions for GitHub Copilot. These instructions help guide code generation and recommendations according to the project's architecture and standards.

## Available Instruction Files

| File                                                                         | Path                                               | Applies To                | Purpose                                                                   |
| ---------------------------------------------------------------------------- | -------------------------------------------------- | ------------------------- | ------------------------------------------------------------------------- |
| [Bans Instructions](.github/instructions/bans.instructions.md)               | `.github/instructions/bans.instructions.md`        | `db/bans.csv`             | Guidelines for managing banned players in the TF2-QuickServer platform    |
| [Core Instructions](.github/instructions/core.instructions.md)               | `.github/instructions/core.instructions.md`        | `packages/core/**/*.ts`        | Guidelines for the core domain layer (models, business rules, interfaces) |
| [Database Instructions](.github/instructions/database.instructions.md)       | `.github/instructions/database.instructions.md`    | `migrations/**/*.ts`      | Guidelines for SQLite database migrations using Knex.js                   |
| [Entrypoints Instructions](.github/instructions/entrypoints.instructions.md) | `.github/instructions/entrypoints.instructions.md` | `packages/entrypoints/**/*.ts` | Guidelines for the user interfaces layer (Discord commands, HTTP APIs)    |
| [Providers Instructions](.github/instructions/providers.instructions.md)     | `.github/instructions/providers.instructions.md`   | `packages/providers/**/*.ts`   | Guidelines for implementation of core interfaces, external integrations   |
| [Server Config Instructions](.github/instructions/servercfg.instructions.md) | `.github/instructions/servercfg.instructions.md`   | `variants/**/*`           | Guidelines for TF2 server configuration, maps, and Docker images          |
| [Shield Instructions](.github/instructions/shield.instructions.md)           | `.github/instructions/shield.instructions.md`      | `shield/**/*`             | Guidelines for the DDoS protection sidecar component                      |
| [Telemetry Instructions](.github/instructions/telemetry.instructions.md)     | `.github/instructions/telemetry.instructions.md`   | `packages/**/*.ts`             | Guidelines for OpenTelemetry usage across the project                     |
| [Tests Instructions](.github/instructions/tests.instructions.md)             | `.github/instructions/tests.instructions.md`       | `packages/**/*.test.ts`        | Guidelines for writing tests using the Given/When/Then approach           |

## Architecture Overview

TF2-QuickServer is a modular monolith using NPM workspaces to separate packages and concerns. It follows Clean Architecture principles with the following layers:

1. **Core** - Domain models and business rules (innermost layer)
2. **Providers** - Implementation of core interfaces (middle layer)
3. **Entrypoints** - User interfaces and API endpoints (outermost layer)

The codebase is organized into NPM workspaces under the `packages/` directory, with each package focused on a specific concern.

The instructions help maintain proper layer separation and adherence to project standards.

## MCP Servers

This project has configured several Model Context Protocol (MCP) servers to enhance Copilot's capabilities in different scenarios:

| MCP Server              | When to Use                                                                                                                  |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **Sequential Thinking** | Use for complex problem solving that requires step-by-step reasoning, algorithm design, or troubleshooting multi-step issues |
| **Context7**            | Use for finding documentation and usage examples for libraries, frameworks, and programming languages                        |
| **AWS Knowledge**       | Use for finding documentation and best practices related to AWS resources and services                                       |
| **GitHub**              | Use for interacting with GitHub features, repository management, and code collaboration workflows                            |

