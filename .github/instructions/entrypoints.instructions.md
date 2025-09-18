---
applyTo: "src/entrypoints/**/*.ts"
---

# Copilot Instructions for Entrypoints Layer (Clean Architecture)

- This is the outermost layer where user interactions occur.
- Handle external interfaces like Discord commands, HTTP requests, and webhooks.
- Implement frameworks like Discord.js, Express, or other UI/API frameworks.
- Focus on:
  - Command handling
  - Request/response formatting
  - Input validation and sanitization
  - Error handling and user feedback
  - UI/UX concerns
- Keep this layer thin; avoid including business logic.
- Call appropriate use cases from the core layer to perform business operations.
- Translate between external input/output formats and core domain models.
- Manage dependency injection container:
  - Instantiate all dependencies
  - Configure providers
  - Wire up the dependency graph
  - Pass dependencies to other layers
- Handle framework-specific concerns and keep them isolated from other layers.
- Format responses in a way appropriate for the interface (Discord messages, HTTP responses).
- Set up proper error handling and present user-friendly error messages.
- Implement middleware for cross-cutting concerns like authentication and logging.
- Configure and initialize external APIs and SDKs (Discord, Express, etc.).
- Handle command registration, routing, and dispatching to the appropriate handlers.
- Do not directly access databases or external services; use providers through use cases.
- Structure commands/endpoints to map clearly to specific use cases.
