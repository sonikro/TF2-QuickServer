---
applyTo: "migrations/**/*.ts"
---

# Copilot Instructions for Database Migrations

## General Guidelines

- Use Knex.js for all database migrations and schema operations
- The project uses SQLite as the database engine
- Follow the naming convention `YYYYMMDDHHMMSS_descriptive_name.ts` for migration files
- Create new migrations using the command `npm run migration:create`
- Migrations will run automatically during application initialization

## Schema Design

- Use appropriate SQLite data types for columns
- Add indexes for columns frequently used in WHERE clauses
- Use foreign keys to ensure referential integrity
- Include helpful comments for complex schema decisions

## Migration Structure

- Always implement both `up` and `down` functions
- The `up` function should create or modify database objects
- The `down` function should completely reverse the changes made in `up`
- Example structure:

```typescript
import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable("table_name", (table) => {
    table.increments("id").primary();
    table.string("name").notNullable();
    table.timestamps(true, true); // adds created_at and updated_at
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable("table_name");
}
```

## Best Practices

- Keep migrations atomic - one conceptual change per migration
- Never modify existing migrations after they've been committed
- Create a new migration to fix issues with previous migrations
- Test both `up` and `down` migrations before committing
- Include meaningful comments for complex operations
