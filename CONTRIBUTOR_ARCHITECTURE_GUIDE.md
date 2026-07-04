# Contributor Architecture Guide

## First Run

```bash
npm ci
npm run check:runtime
npm run verify
```

`npm run verify` runs the full local quality gate (lint, typecheck, and tests) against the
repo-owned controlled target, so it does not require any external service or credentials.

## Project Map

| Area                         | Purpose                                                                             |
| ---------------------------- | ----------------------------------------------------------------------------------- |
| `src/`                       | Framework fixtures, API clients, page objects, utilities, and observability support |
| `tests/`                     | Playwright specs by capability (api, e2e, visual, accessibility, contracts)         |
| `test-target/`               | Repo-owned controlled target app used as the default test target                    |
| `scripts/`                   | Environment checks, sharding, target runner, and flake/quarantine tooling           |
| `docs/`                      | Architecture, execution, flakiness, data isolation, and writing-tests guides        |
| `reliability/quarantine.yml` | Quarantine policy and known exceptions                                              |

## Commands

- Runtime check: `npm run check:runtime`
- Lint: `npm run lint`
- Typecheck: `npm run type-check`
- API tests: `npm run test:api`
- E2E tests: `npm run test:e2e`
- Visual tests: `npm run test:visual`
- Accessibility tests: `npm run test:accessibility`
- Full verification: `npm run verify`
- Local target wrapper: `npm run with:target -- <command>`

## Change Workflow

1. Prefer a targeted Playwright project or a named spec over a full-suite run while iterating.
2. Preserve the quarantine, flake-reporting, visual-snapshot, and controlled-target conventions
   documented under `docs/`.
3. Run `npm run verify` before opening a PR.
