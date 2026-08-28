# AGENTS.md

## Project Context

TF2-QuickServer is a Discord bot (discord.js) that deploys Team Fortress 2 game servers
on Oracle Cloud Infrastructure (OCI) Container Instances and AWS Local Zones, then
returns connection info. It is a TypeScript npm-workspace monolith following Clean
Architecture — `@tf2qs/core` (domain) → `@tf2qs/providers` (cloud/SRCDS integrations) →
`@tf2qs/entrypoints` (Discord commands + Express HTTP API) — persisting to SQLite via
Knex, with OpenTelemetry telemetry, a static Next.js landing page, and Docker "fat
image" server variants.

## Codebase Map

| Path | Purpose |
|------|---------|
| `src/index.ts` | Process entrypoint: initializes telemetry, boots the Discord bot |
| `packages/core` | Domain models, use cases, interfaces (innermost layer, framework-free) |
| `packages/providers` | Implements `core` interfaces: OCI, AWS SDK, RCON, SRCDS log receiver |
| `packages/entrypoints` | Discord slash commands + Express HTTP API (OpenAPI in `docs/api/`) |
| `packages/telemetry` | OpenTelemetry setup; import once at boot |
| `packages/web` | Next.js static-export landing page → S3/CloudFront; **see `packages/web/AGENTS.md`** |
| `packages/scripts` | One-off TS scripts (OpenAPI gen, map download, FastDL sync) |
| `config/default.json` | node-config: regions/variants/persistence; `terraform:*` outputs → `config/local.json` (gitignored) |
| `migrations/`, `knexfile.ts` | Knex/SQLite schema migrations |
| `db/bans.csv` | Static ban list (shipped to servers by the release workflow) |
| `variants/` | Per-variant Dockerfiles + TF2 `cfg`/SourceMod configs ("fat" images bake in maps) |
| `terraform/` | OCI + AWS + landing-page IaC (Terragrunt for landing-page) |
| `docs/`, `adr/`, `tests/` | Architecture docs, ADRs, vitest setup (`setup.ts`) |
| `.github/` | CI workflows + `skills/` (progressive-disclosure agent rules) |

## Tooling & Commands

- Install: `npm ci`
- Run bot locally: `npm run dev:backend` (nodemon); requires `.env` from `.env.example`.
  Prod/direct entry: `npm run start:backend` (`tsx --env-file .env ./src/index.ts`).
- Tests: `npm test` (vitest). Run before declaring any task done.
- Typecheck/build: `npm run build:backend` (tsc). **No linter is configured.**
- Web: `npm run dev:web` / `npm run build:web` (static export → `packages/web/out/`).
- Migrations: `npm run migration:create <name>` / `npm run migration:run`
- Codegen: `npm run gen:openapi` · Maps: `npm run download:maps` / `download:maps:casual` · FastDL: `npm run sync:fastdl`
- Infra: `npm run terraform:plan` / `terraform:deploy`
- Variant images: `npm run build:fat:<variant>` (e.g. `standard-competitive-i386`, `tf2pickup`); `push:fat:<variant>` publishes
- CI (`.github/workflows/release.yaml`) runs `npm ci` → `build:backend` → `build:web` → `npm test` → JSON-validates `config/default.json`.

## Local Norms

- **Clean Architecture**: keep `core` free of infra/framework imports; implement core interfaces in `providers`; wire it all together in `entrypoints`.
- **Naming**: snake_case filenames, camelCase functions/variables, PascalCase classes/types. Strict TS (`strict: true`), NodeNext modules, imports via `@tf2qs/*` workspace aliases.
- **Style**: SOLID, DRY, no code comments, DI via one grouped constructor-params object marked `private readonly`, functions take a single named-params object, prefer composition and strategy/factory patterns, favor pure immutable functions. Activate **`.github/skills/code-style/skill.md`**.
- **Layer rules**: when editing a layer, activate its skill — `core-layer`, `providers-layer`, `entrypoints-layer` (under `.github/skills/`).
- **Tests**: Vitest, Given/When/Then `it` names, a `makeSut` factory per file, mocks via `vitest-mock-extended`/`vitest-when` (`aws-sdk-client-mock` for AWS, `msw` for fetch). Mock setup lives inside `makeSut`/tests, never in global `beforeEach`. Activate **`.github/skills/tests/skill.md`**.
- **Other domains**: see `.github/skills/` for `telemetry`, `database`, `server-config` (variants/maps), `bans`, `shield`.
- **Commits/PRs**: Conventional Commits with scopes (`feat(api):`, `fix(cfg):`, `chore(maps):`, `docs:`), body states what/why, PR ref `(#NNN)`. Follow **`.github/skills/conventional-commits/skill.md`** when committing or writing PR descriptions.
- **Safety**: never commit secrets, `.env`, or `keys/`. `maps/`, `config/local.json`, `out/`, `.terraform` are gitignored. Keep README and docs in sync with code changes.

## Self-Correction

This map goes stale as the repo evolves. If any section is wrong, or a user gives a
stylistic or structural correction, update AGENTS.md immediately so subsequent
sessions retain that working knowledge. Likewise, extract any new repeatable task
pattern into `.github/skills/` rather than growing this file.