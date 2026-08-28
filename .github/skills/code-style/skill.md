---
name: code-style
description: "Use when writing, editing, or reviewing TypeScript/JavaScript code in packages/* and src/ of this repository. Enforces the project's coding style — snake_case filenames, camelCase functions/variables, PascalCase classes/types, SOLID and DRY, no code comments, constructor dependency injection via one grouped params object marked private readonly, functions taking a single named-params object, strategy/factory patterns, and pure immutable functions. Do not use for Go code in shield/ or TF2 cfg/variant files."
---

# TypeScript Code Style

The repository is a strict TypeScript npm-workspace monolith. Follow the
principles below; they come from the repo's contributor standards and existing
code patterns.

## General Principles

- Follow SOLID principles and keep code DRY.
- Write self-documenting code — **no comments**. If something needs a comment,
  extract it into a function with a descriptive name instead.
- Avoid writing code that isn't needed; favor built-in functions and libraries.
- Use camelCase for variable and function names.
- Use PascalCase for class and type names.
- Use snake_case for file names (e.g. `server-manager.ts`).
- Favor composition over inheritance.
- Write pure functions whenever possible; favor immutability over mutating state.
- For complex logic, break it down into smaller functions with descriptive names.
- Favor splitting large files into smaller, focused ones.
- Do not write unsolicited documentation/markdown explaining ideas unless
  explicitly requested.
- When writing user-facing text, use clear simple language without emojis.

## Creating Classes

Classes receive dependencies via constructor injection. Dependencies are grouped
into a single object and marked `private readonly`:

```typescript
type UserServiceDependencies = {
  userRepository: UserRepository;
};

class UserService {
  constructor(private readonly dependencies: UserServiceDependencies) {}
}
```

## Writing Functions

Functions always receive a single object parameter so arguments are named:

```typescript
type CreateUserParams = {
  name: string;
  email: string;
};

function createUser(params: CreateUserParams) {
  const { name, email } = params;
}
```

## Design Patterns

- Use the **Strategy Pattern** to encapsulate algorithms and behaviors.
- Use the **Factory Pattern** to create instances of classes when needed.

## Architecture Context

This skill covers code style only. Layer-specific rules live in dedicated
skills; activate the matching one when editing that layer:

- `core-layer` — `packages/core/**/*.ts`
- `providers-layer` — `packages/providers/**/*.ts`
- `entrypoints-layer` — `packages/entrypoints/**/*.ts`
- `tests` — `**/*.test.ts`
- `telemetry` — logging/metrics/tracing