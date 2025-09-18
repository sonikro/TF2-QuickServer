---
applyTo: "src/providers/**/*.ts"
---

# Copilot Instructions for Providers Layer (Clean Architecture)

- Implement the interfaces defined in the core layer.
- This layer serves as the infrastructure/adapter layer in clean architecture.
- Connect to external services, databases, APIs, and third-party libraries.
- Translate between core domain models and external data formats.
- Keep implementation details isolated from the core business logic.
- Handle technical concerns such as:
  - Database connections and queries
  - HTTP/API client implementations
  - File system operations
  - External service integrations
  - Caching mechanisms
  - Authentication with external services
- Each provider should implement a specific interface from the core layer.
- Encapsulate all external dependencies within this layer.
- Do not include business logic in providers; they should focus on infrastructure concerns.
- Use dependency injection to make providers configurable and testable.
- Handle technical errors and translate them to domain errors when appropriate.
- Keep providers focused on a single responsibility.
