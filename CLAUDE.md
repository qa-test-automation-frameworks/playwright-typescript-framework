# CLAUDE.md

## Project

Playwright + TypeScript framework for API, authenticated/anonymous UI, visual,
accessibility, selector-contract, cross-browser, flake, and observability checks.

## Session Start

Refresh the local code graph before structural discovery:

`bash .agent/index-codebase-memory.sh`

Current MCP project name:

`home-vyaspc-Documents-Repo-playwright-typescript-framework`

## Commands

- Install: `npm ci`
- Runtime check: `npm run check:runtime`
- Lint: `npm run lint`
- Typecheck: `npm run type-check`
- API tests: `npm run test:api`
- E2E tests: `npm run test:e2e`
- Visual tests: `npm run test:visual`
- Accessibility tests: `npm run test:accessibility`
- Full verification: `npm run verify`
- Local target wrapper: `npm run with:target -- <command>`

## Layout

- `src/` - framework fixtures, clients, pages, utilities, and observability support.
- `tests/` - Playwright specs by capability.
- `test-target/` - local controlled target app.
- `scripts/` - environment checks, sharding, target runner, flake/quarantine tools.
- `docs/` - architecture, execution, flakiness, data isolation, and writing-tests guides.
- `reliability/quarantine.yml` - quarantine policy and known exceptions.

## Codebase Memory MCP

Use graph tools before broad file reads:

1. `list_projects`
2. `get_architecture(project="home-vyaspc-Documents-Repo-playwright-typescript-framework")`
3. `search_graph`
4. `trace_path`
5. `get_code_snippet`
6. `query_graph`

Fall back to `rg` for literals, configs, docs, generated files, scripts/tests excluded from the
graph, or insufficient graph results.

## Agent Rules

- Cite `file:line` for code claims whenever practical.
- Prefer targeted Playwright projects or a named spec over full-suite reruns.
- Preserve quarantine, flake reporting, visual snapshot, and controlled-target conventions.
- Do not commit `.codebase-memory/`, `codebase-memory/`, or `.agent/index-codebase-memory.sh`.

