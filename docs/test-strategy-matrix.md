# Test Strategy Matrix

| Capability                         | API coverage                                                                            | UI coverage                                                                    | Visual coverage          | Accessibility coverage           | Notes                                                                                             |
| ---------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ------------------------ | -------------------------------- | ------------------------------------------------------------------------------------------------- |
| Authentication                     | `tests/api/auth.api.spec.ts`                                                            | `tests/e2e/auth.spec.ts`                                                       | Login page screenshot    | Login page scan                  | API checks validate token contracts; UI checks validate user-visible login/register/logout.       |
| Articles                           | `tests/api/articles.api.spec.ts`, `tests/api/controlled-target-regressions.api.spec.ts` | `tests/e2e/article-lifecycle.spec.ts`                                          | Article page screenshot  | Article details and editor scans | API creates and verifies contract behavior, validation, authorization, pagination, and filtering. |
| Comments                           | `tests/api/articles.api.spec.ts`, `tests/api/controlled-target-regressions.api.spec.ts` | `tests/e2e/article-lifecycle.spec.ts`                                          | Article page screenshot  | Article details scan             | Comment creation and validation are checked through API and UI workflows.                         |
| Profiles                           | `tests/api/profile.api.spec.ts`                                                         | `tests/e2e/user-journey.spec.ts`                                               | Profile page screenshot  | Profile page scan                | Profile article lists and social relationships are checked in API/UI.                             |
| Social graph                       | `tests/api/profile.api.spec.ts`, `tests/api/controlled-target-regressions.api.spec.ts`  | `tests/e2e/user-journey.spec.ts`                                               | Followed feed screenshot | Followed author feed scan        | Follow/unfollow and personal feed behavior are critical-path checks.                              |
| Feed and tags                      | `tests/api/articles.api.spec.ts`, `tests/api/controlled-target-regressions.api.spec.ts` | `tests/e2e/user-journey.spec.ts`                                               | Home feed screenshot     | Home feed scan                   | API validates tag filtering and pagination; UI validates global and personal feed behavior.       |
| Network resilience                 | Not applicable                                                                          | `tests/e2e/network-resilience.spec.ts`                                         | Not covered              | Not covered                      | `page.route()` controls API failure behavior for deterministic UI error coverage.                 |
| Cross-browser smoke                | Not applicable                                                                          | `firefox-smoke`, `webkit-smoke`, `mobile-chrome-smoke` projects                | Not covered              | Not covered                      | Smoke-tagged browser flows validate portability on every push.                                    |
| Scheduled cross-browser regression | Not applicable                                                                          | `firefox-regression`, `webkit-regression`, `mobile-chrome-regression` projects | Not covered              | Not covered                      | Scheduled CI runs the broader authenticated E2E regression suite across secondary browsers.       |

## Execution Layers

- **Runtime gate:** `npm run check:runtime` enforces Node 20 and npm 10+.
- **Static gates:** formatting, ESLint, TypeScript.
- **Environment gate:** `npm run check:env`.
- **Secret gate:** `npm run check:secrets`.
- **API suite:** fast contract and data behavior checks.
- **Chromium UI suite:** full critical workflow checks.
- **Visual suite:** screenshot comparison for stable high-value pages.
- **Accessibility suite:** Axe checks for critical pages.
- **Cross-browser smoke:** small browser portability subset.
- **Scheduled cross-browser regression:** broader Firefox, WebKit, and mobile Chrome E2E run on the cron workflow.
- **Observability smoke:** `npm run test:otel` validates trace-producing API/UI paths when the local collector is running.

## Review Expectations

A portfolio reviewer should be able to inspect:

- `README.md` for setup and command flow.
- `docs/CONTROLLED_TEST_ENVIRONMENT.md` for deterministic target requirements.
- `.github/workflows/ci.yml` for quality gates and artifacts.
- Published CI/Allure history from the public repository.
