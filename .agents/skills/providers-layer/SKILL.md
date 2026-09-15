---
name: providers-layer
description: "Use when writing or modifying code in packages/providers/**/*.ts. Enforces the Clean Architecture adapter-layer rules — implement the interfaces defined in core, encapsulate all external infrastructure (OCI, AWS SDK, RCON, SRCDS, HTTP clients, filesystem, caches, external auth), translate between core domain models and external data formats, keep business logic out of providers, use dependency injection, and keep each provider focused on a single responsibility."
---

# Providers Layer (Clean Architecture)

`packages/providers` (`@tf2qs/providers`) is the infrastructure/adapter layer
that implements the interfaces declared in `packages/core`.

## Rules

- Implement the interfaces defined in the core layer.
- Serve as the infrastructure/adapter layer in clean architecture.
- Connect to external services, databases, APIs, and third-party libraries.
- Translate between core domain models and external data formats.
- Keep implementation details isolated from core business logic.
- Handle technical concerns such as:
  - Database connections and queries
  - HTTP/API client implementations
  - File system operations
  - External service integrations (OCI, AWS, SRCDS, RCON)
  - Caching mechanisms
  - Authentication with external services
- Each provider implements a specific interface from the core layer.
- Encapsulate all external dependencies within this layer.
- Do not include business logic in providers; focus on infrastructure concerns.
- Use dependency injection to keep providers configurable and testable.
- Handle technical errors and translate them to domain errors when appropriate.
- Keep providers focused on a single responsibility.

## How to Work Here

- Test providers with the `tests` skill conventions (`aws-sdk-client-mock`
  exists specifically for AWS SDK clients, `msw` for HTTP).
- Surface domain errors so calling use cases in core stay pure.
- Follow the `code-style` skill for naming and structure.