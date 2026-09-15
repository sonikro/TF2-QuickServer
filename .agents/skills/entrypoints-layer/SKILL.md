---
name: entrypoints-layer
description: "Use when writing or modifying code in packages/entrypoints/**/*.ts. Enforces the Clean Architecture outermost-layer rules — Discord slash commands, Express HTTP routes, and webhooks only; keep the layer thin with no business logic, delegate to core use cases, validate/sanitize input, format responses per interface, wire up the dependency injection graph, and never access databases or external services directly — go through use cases and providers."
---

# Entrypoints Layer (Clean Architecture)

`packages/entrypoints` (`@tf2qs/entrypoints`) is the outermost layer where user
interactions occur: Discord commands, HTTP requests, and webhooks.

## Rules

- Implement external interface concerns: Discord.js, Express, and other UI/API
  frameworks.
- Keep this layer **thin** — no business logic.
- Call core-layer use cases to perform business operations.
- Translate between external input/output formats and core domain models.
- Focus on:
  - Command handling and dispatching to the appropriate handlers
  - Request/response formatting
  - Input validation and sanitization
  - Error handling and user-friendly feedback
  - UI/UX concerns (Discord embeds, HTTP status codes)
- Do not directly access databases or external services; use providers through
  use cases.
- Structure commands/endpoints so they map clearly to specific use cases.

## Dependency Wiring

The entrypoints layer manages the composition root:

- Instantiate all dependencies.
- Configure providers.
- Wire up the dependency graph.
- Pass dependencies to the other layers.
- Configure and initialize external APIs and SDKs (Discord, Express, etc.).
- Implement middleware for cross-cutting concerns (auth, logging).

## How to Work Here

- Format responses appropriately per interface (Discord messages, HTTP
  responses) and present friendly errors.
- Keep framework-specific concerns isolated from other layers.
- Follow the `tests` skill when writing tests for commands/routes.
- Follow the `code-style` skill for naming and structure.