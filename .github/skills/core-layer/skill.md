---
name: core-layer
description: "Use when writing or modifying code in packages/core/**/*.ts. Enforces the Clean Architecture innermost layer rules — only domain models, business rules, use cases, and interfaces; no infrastructure, database, external API, or framework dependencies; use cases must be pure and depend only on core interfaces and models; all dependencies injected via core interfaces; never import third-party libraries directly into use cases."
---

# Core Layer (Clean Architecture)

`packages/core` (`@tf2qs/core`) is the innermost layer of the monolith. It is
framework-free by design.

## Rules

- Only define domain models, business rules, and interfaces for core behaviors.
- Do not include implementation details for databases, external APIs, or
  protocol clients.
- Use cases must be pure and depend only on core interfaces and models.
- Do not import or use third-party libraries directly in use cases.
- All dependencies are injected via interfaces defined in this layer.
- Focus on business logic, validation, and domain-driven design.
- Avoid anything that couples this layer to infrastructure or frameworks.

## How to Work Here

- Define repository/port interfaces in core; concrete implementations live in
  `packages/providers` (see `providers-layer` skill).
- Wire use cases to entrypoints in `packages/entrypoints` (see
  `entrypoints-layer` skill) — core itself never imports them.
- Follow the `code-style` skill for naming and structure.