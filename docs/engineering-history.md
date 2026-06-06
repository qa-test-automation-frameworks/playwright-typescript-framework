# Engineering History

This project is maintained as an iterative automation framework rather than a one-shot code dump.

## Current Evolution Milestones

- Established a strict TypeScript Playwright foundation with typed API clients, Zod response validation, page objects, builders, and composed fixtures.
- Added a repo-owned Conduit-compatible controlled target so local and CI runs do not depend on public demo infrastructure.
- Split quality gates across API, authenticated and anonymous E2E, visual regression, accessibility, cross-browser smoke, and scheduled regression jobs.
- Added Allure, Playwright HTML, JUnit, and JSON artifacts for reviewer-visible diagnostics.
- Hardened API/UI setup and cleanup with per-test resources and immediate cleanup registration.
- Refined page object contracts so action methods perform actions while specs own assertions and postconditions.
- Replaced ambiguous article-page locators with scoped, strict locator contracts.
- Added page-specific readiness checks for domain content instead of relying on generic browser load state.
- Added selector-contract tests for required `data-testid` surfaces in the controlled UI.
- Added pinned Playwright container execution for Linux CI jobs while preserving Windows visual baselines.

## Review Guidance

Reviewers should inspect the commit history, ADRs, CI workflow, and high-signal tests together. The most representative files are:

- `playwright.config.ts`
- `.github/workflows/ci.yml`
- `src/fixtures`
- `src/api`
- `src/pages`
- `tests/api`
- `tests/e2e/article-lifecycle.spec.ts`
- `tests/contracts/selectors/controlled-ui.selectors.spec.ts`
- `tests/visual`
- `tests/accessibility`
