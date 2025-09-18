# TF2-QuickServer Copilot Instructions Index

This file serves as an index for all project-specific instructions for GitHub Copilot. These instructions help guide code generation and recommendations according to the project's architecture and standards.

## Available Instruction Files

| File                                                                         | Path                                               | Applies To                | Purpose                                                                   |
| ---------------------------------------------------------------------------- | -------------------------------------------------- | ------------------------- | ------------------------------------------------------------------------- |
| [Core Instructions](.github/instructions/core.instructions.md)               | `.github/instructions/core.instructions.md`        | `src/core/**/*.ts`        | Guidelines for the core domain layer (models, business rules, interfaces) |
| [Database Instructions](.github/instructions/database.instructions.md)       | `.github/instructions/database.instructions.md`    | `migrations/**/*.ts`      | Guidelines for SQLite database migrations using Knex.js                   |
| [Entrypoints Instructions](.github/instructions/entrypoints.instructions.md) | `.github/instructions/entrypoints.instructions.md` | `src/entrypoints/**/*.ts` | Guidelines for the user interfaces layer (Discord commands, HTTP APIs)    |
| [Providers Instructions](.github/instructions/providers.instructions.md)     | `.github/instructions/providers.instructions.md`   | `src/providers/**/*.ts`   | Guidelines for implementation of core interfaces, external integrations   |
| [Server Config Instructions](.github/instructions/servercfg.instructions.md) | `.github/instructions/servercfg.instructions.md`   | `variants/**/*`           | Guidelines for TF2 server configuration, maps, and Docker images          |
| [Telemetry Instructions](.github/instructions/telemetry.instructions.md)     | `.github/instructions/telemetry.instructions.md`   | `src/**/*.ts`             | Guidelines for OpenTelemetry usage across the project                     |
| [Tests Instructions](.github/instructions/tests.instructions.md)             | `.github/instructions/tests.instructions.md`       | `src/**/*.test.ts`        | Guidelines for writing tests using the Given/When/Then approach           |

## Architecture Overview

TF2-QuickServer follows Clean Architecture principles with the following layers:

1. **Core** - Domain models and business rules (innermost layer)
2. **Providers** - Implementation of core interfaces (middle layer)
3. **Entrypoints** - User interfaces and API endpoints (outermost layer)

The instructions help maintain proper layer separation and adherence to project standards.

## MCP Servers

This project has configured several Model Context Protocol (MCP) servers to enhance Copilot's capabilities in different scenarios:

| MCP Server              | When to Use                                                                                                                  |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **Sequential Thinking** | Use for complex problem solving that requires step-by-step reasoning, algorithm design, or troubleshooting multi-step issues |
| **Context7**            | Use for finding documentation and usage examples for libraries, frameworks, and programming languages                        |
| **AWS Knowledge**       | Use for finding documentation and best practices related to AWS resources and services                                       |
| **GitHub**              | Use for interacting with GitHub features, repository management, and code collaboration workflows                            |

