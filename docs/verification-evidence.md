# Verification Evidence

Last local remediation verification: **2026-06-06**

Runtime used for local checks:

- Node: `v24.13.0`
- npm: `11.6.2`
- Project engine baseline: Node `>=20`, npm `>=10`

## Local Quality Gates

| Gate                           | Command                          | Status               |
| ------------------------------ | -------------------------------- | -------------------- |
| Runtime compatibility          | `npm run check:runtime`          | Passed on 2026-06-06 |
| Formatting                     | `npm run format:check`           | Passed on 2026-06-06 |
| Lint                           | `npm run lint`                   | Passed on 2026-06-06 |
| TypeScript                     | `npm run type-check`             | Passed on 2026-06-06 |
| Secret scan                    | `npm run check:secrets`          | Passed on 2026-06-06 |
| Anti-pattern scan              | `npm run check:anti-patterns`    | Passed on 2026-06-06 |
| Visual snapshot hygiene        | `npm run check:visual-snapshots` | Passed on 2026-06-06 |
| OpenAPI/Zod contract alignment | `npm run check:openapi-contract` | Passed on 2026-06-06 |

## Full Framework Gate

The release proof command remains:

```bash
npm run verify:target
```

This starts the repo-owned controlled Conduit target, validates environment readiness, and runs API, E2E, visual, accessibility, selector-contract, cross-browser, flake, and static quality gates.

Latest local result on 2026-06-06: **passed**.

Observed suite totals from the full gate:

- API: 30 passed
- E2E: 19 passed
- Visual: 8 passed
- Accessibility: 8 passed
- Selector contracts: 8 passed
- Cross-browser smoke: 14 passed

## CI Evidence

- CI workflow: [GitHub Actions CI](https://github.com/qa-test-automation-frameworks/playwright-typescript-framework/actions/workflows/ci.yml)
- Published Allure history: [Allure report](https://qa-test-automation-frameworks.github.io/playwright-typescript-framework/)

## Release Checklist

- All environment examples use placeholders, not reusable credentials.
- Visual snapshots under `tests/visual/**/*-snapshots/*.png` are intentionally reviewed and listed in `tests/visual/visual-snapshots.manifest.json`.
- OpenAPI examples in `docs/openapi/conduit-controlled-target.openapi.json` satisfy the runtime Zod schemas used by API clients.
- Critical UI journeys use report-visible `test.step()` wrappers through `observedStep()`.
