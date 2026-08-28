---
name: conventional-commits
description: "Use when creating or amending git commits, writing pull request titles or descriptions, or reviewing commit messages in the TF2-QuickServer repository. Enforces the Conventional Commits standard with type and scope (feat(api):, fix(cfg):, chore(maps):, docs:) and PR reference formatting (#NNN) as observed in the repository's git history, plus this project's rules for what to commit, verify, and never commit. Do NOT activate for non-git writing tasks such as editing source files or tests."
---

# Conventional Commits & PR Descriptions

Standardize every commit and pull request in TF2-QuickServer using the
[Conventional Commits](https://www.conventionalcommits.org) format, which is the
established convention in this repo's `git history` (e.g. `feat(api):`,
`fix(cfg):`, `chore(maps):`, `docs:`, `feat(web): ... (#342)`).

## Commit Format

```
<type>(<scope>): <imperative summary>

<body: what changed and why>
```

### Types

Use one of the standard types. The most common in this repo:

- `feat` — new capability (new command, endpoint, variant, plugin)
- `fix` — bug fix
- `chore` — maintenance (version bumps, whitelist updates, dependency updates)
- `docs` — documentation only (README, docs/, adr/)
- `refactor` — behavior-preserving code changes
- `test` — test-only changes
- `build` / `ci` — build system or CI config changes
- `perf` — performance improvement
- `style` — formatting, no code change

### Scope

Prefer a scope naming the affected package or area. Observed scopes include:

- `api` (Express endpoints), `web` (landing page)
- `core`, `providers`, `entrypoints`, `telemetry`
- `cfg` (TF2 configs/whitelists), `variants`, `maps`, `sourcemod`, `plugins`
- `bf`, `cltf2`, `ozfortress`, `tf2pickup`, `mge` (variant/federation-specific)
- `deps` (dependency updates), `servers` (server lifecycle), `shield` (DDoS sidecar)

Use a bare type when no single area dominates (e.g. `feat: add scheduled server
creation (#339)`).

### Subject line rules

- Imperative mood, present tense, lowercase after the colon: `feat(api): add
  SourceTV connections endpoint` — never `feat(api): Added ...`.
- No trailing period. Keep under ~72 chars; put detail in the body.
- For squash-merged PRs, append the PR reference: `fix(web): rewrite /docs to
  /docs/index.html (#340)`.

### Body rules

- Blank line after the subject, then state **what** changed and **why**.
- Reference issues/PRs with `#NNN`. Wrap at ~72 chars.
- This repo ships real changes to prod servers — say why the change is necessary
  (e.g. "the private S3 origin returns 403 for extension-less keys").

## Workflow

1. Run `npm test` (and `npm run build:backend` for TS changes) before committing.
2. Commit after each coherent change; never batch unrelated work into one commit.
3. Stage only intended files: `git status` + `git diff` first. Never commit secrets,
   `.env`, `keys/`, `maps/`, `config/local.json`, build output, or `node_modules/`.
4. Follow the tool's guidance: attach the PR reference `(#NNN)` when the working
   history is squash-merged, and keep one logical change per commit.

## Pull Request Descriptions

Write PRs to match the commit standard:

- **Title**: the commit subject (e.g. `fix(web): add CloudFront function rewrite
  for /docs`).
- **Summary**: what changed and why, mirroring the commit body.
- **Key changes**: bullet list derived from the diff scopes.
- **Testing**: what you ran (`npm test`, `npm run build:backend`, `npm run build:web`,
  manual checks) — CI runs all three, so be explicit about local verification.
- **Related**: `Fixes #NNN` / `Closes #NNN` where applicable.

## Examples

```
feat(api): add SourceTV connections endpoint with scope-based auth (#342)

Add GET /api/sourcetv-connections returning SourceTV connection info
(server IP/port, TV address, TV password) for all ready servers, gated
by the read:sourcetv:all scope. Server endpoints now require the
manage:servers scope. RCON and join passwords are never exposed.

chore(cfg): update whitelist for brpickup cfg

docs: document schedule commands in README and landing page
```