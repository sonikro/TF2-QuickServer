---
name: database
description: Use when writing or modifying database migrations in migrations/**/*.ts or any Knex/SQLite schema work. Enforces Knex.js usage on SQLite, the YYYYMMDDHHMMSS_descriptive_name.ts naming convention, migration:create scaffolding, atomic one-conceptual-change migrations, both up and down functions, never modifying committed migrations, and testing both directions before committing.
---

# Database Migrations (Knex + SQLite)

The project persists to **SQLite via Knex**. All schema changes happen through
migrations in `migrations/`.

## General Guidelines

- Use Knex.js for all database migrations and schema operations.
- The database engine is SQLite.
- Name migration files `YYYYMMDDHHMMSS_descriptive_name.ts`.
- Scaffold new migrations with `npm run migration:create <name>`.
- Migrations run automatically during application initialization.

## Schema Design

- Use appropriate SQLite data types for columns.
- Add indexes for columns frequently used in `WHERE` clauses.
- Use foreign keys to ensure referential integrity.
- Include meaningful comments only for complex schema decisions (code is
  otherwise comment-free per the `code-style` skill).

## Migration Structure

Always implement both `up` and `down` functions:

```typescript
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('table_name', (table) => {
    table.increments('id').primary();
    table.string('name').notNullable();
    table.timestamps(true, true); // adds created_at and updated_at
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('table_name');
}
```

- `up` creates or modifies database objects.
- `down` completely reverses the changes made in `up`.

## Best Practices

- Keep migrations atomic — one conceptual change per migration.
- **Never modify an already-committed migration.** Create a new migration to
  fix issues with previous ones.
- Test both `up` and `down` migrations before committing.
- Verify with `npm run migration:run`.