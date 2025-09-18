---
applyTo: "src/core/**/*.ts"
---

# Copilot Instructions for Core Layer (Clean Architecture)

- Only define domain models, business rules, and interfaces for core behaviors.
- Do not include implementation details for databases, external APIs, or protocol clients.
- Use Cases must be pure and depend only on core interfaces and models.
- Do not import or use third-party libraries directly in Use Cases.
- All dependencies should be injected via interfaces defined in the core layer.
- Focus on business logic, validation, and domain-driven design.
- Avoid any code that couples this layer to infrastructure or frameworks.