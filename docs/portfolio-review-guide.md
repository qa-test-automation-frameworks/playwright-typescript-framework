# Portfolio Review Guide

This repository demonstrates Playwright and TypeScript checks against a
repository-owned Conduit-compatible target. The target makes test data,
failure modes, and browser journeys reproducible; it is not independent
validation of a separate production application.

## A 12-minute, browser-free review

Prerequisites are Git, Node.js `24.21.0`, npm `10.9.4`, and access to GitHub
and npm. From a disposable directory:

```sh
git clone https://github.com/qa-test-automation-frameworks/playwright-typescript-framework.git
cd playwright-typescript-framework
npx --yes npm@10.9.4 ci
npm run test:unit
```

The unit command should exit `0`; it uses fake request contexts and synthetic
configuration and does not contact the target. Its JSON and JUnit output are
under `test-results/framework-unit/`.

Then run the intentional negative control:

```sh
npx playwright test --config=playwright.evidence-control.config.ts
```

This command should exit nonzero with exactly one failure named
`E02_EXPECTED_FAILURE_CONTROL`; its JSON report is
`test-results/evidence-control/results.json`. That red result is the expected
behavior of the probe, not a product or CI regression. Both commands are
browser-free and do not call the application target.

## Where to look next

- `playwright.config.ts` — project boundaries, retries, reporters, artifacts,
  and browser configuration.
- `scripts/run-framework-unit.js` and `tests/unit/` — hermetic unit checks and
  the fake target configuration.
- `playwright.evidence-control.config.ts` — the isolated expected-failure
  control.
- `src/fixtures/`, `src/api/`, and `src/pages/` — shared setup, typed API
  clients, and page objects.
- `docs/CONTROLLED_TEST_ENVIRONMENT.md` — the repository-owned target,
  supported external compatibility mode, and their limits.
- The [live evidence dashboard](https://qa-test-automation-frameworks.github.io/.github/)
  — start with its generation time, then follow the Playwright source-run link.

For the longer browser and target checks, `npm run verify:target` starts the
repository-owned target and runs the full verification sequence. These results
show that the framework works with its controlled contract; because the target
and tests can change together, they do not establish independent product
validation. Public RealWorld demo endpoints are optional exploratory targets,
not the required or deterministic CI target.

## Review questions and limitations

1. Can you distinguish test execution, evidence publication, and dashboard
   freshness?
2. Does the negative control fail for the intended reason and retain its
   report?
3. Do the setup and cleanup fixtures make data ownership and failure behavior
   clear?
4. Which part of the framework would need adaptation for a separately governed
   application's authentication, data model, and release process?

Cross-browser, accessibility, visual, and shared-application checks are present
in CI, but this short review does not run them. The controlled target is not an
external customer's system, and this exercise does not establish production
readiness or independent adoption by users of the other frameworks.
