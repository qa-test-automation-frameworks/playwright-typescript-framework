# Debugging Test Failures

## Start With The Failure Type

Run the smallest command that reproduces the issue:

```bash
npm run test:api
npm run test:e2e
npm run test:visual
npm run test:accessibility
npm run test:cross-browser
```

For a single spec:

```bash
npx playwright test tests/e2e/auth.spec.ts --project=chromium-anonymous
```

## Configuration Failures

Errors from `src/utils/config.ts` mean an environment variable is missing or invalid. Create `.env` from `.env.example` locally, or configure the matching GitHub Actions variable or secret in CI.

Run:

```bash
npm run check:env
```

This confirms both UI and API readiness before the full suite produces noisy downstream failures.

## API Failures

API failures usually come from target environment availability, authentication, schema drift, or cleanup state.

- Enable `DEBUG_API=true` for redacted request and response logging.
- Check the status and response body in the thrown `ApiError`.
- Confirm `API_URL` points at the expected RealWorld API contract.
- Re-run the related API spec before debugging the browser layer.

## Browser Flow Failures

Use Playwright traces, screenshots, and videos from `test-results` or `playwright-report`.

![Curated failure screenshot](assets/screenshots/debugging-failure.png)

Common checks:

- Confirm setup created `.auth/user.json` for authenticated projects.
- Verify the correct project is being used. Auth flows run in `chromium-anonymous`; most other E2E specs use authenticated state.
- Prefer locator and URL evidence over adding fixed waits.
- Inspect page object selectors before changing spec assertions.

## Visual Failures

Visual specs run with a fixed Chromium viewport, UTC timezone, `en-US` locale, light color scheme, and reduced motion.

When a visual diff is expected:

```bash
npm run test:update-snapshots
```

Review the new baseline images before committing them. Do not update snapshots to hide product regressions.

## Accessibility Failures

Accessibility specs use Axe on critical pages. Treat violations as product or markup issues unless the scan target is wrong.

Check:

- The page reached the intended authenticated or anonymous state.
- Dynamic content finished rendering before `AxeBuilder.analyze()`.
- The failure is not caused by an unavailable test target.

## Cleanup Failures

`CleanupRegistry` fails tests when registered resources cannot be deleted. This is intentional because leftover articles or comments can cause future flakiness.

If cleanup fails:

- Check whether the resource already disappeared.
- Confirm the token used for deletion owns the resource.
- Re-run against a controlled environment if the public demo service is inconsistent.

## Reports

Generate and inspect Allure after a run:

```bash
npm run allure:generate
npm run allure:open
```

Use `npm run clean` to remove local generated artifacts before a fresh run.
