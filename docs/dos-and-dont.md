# Dos And Don'ts

## Do

- Use strict TypeScript types and Zod schemas for API responses.
- Keep API request behavior centralized in `BaseApiClient`.
- Add domain-specific API methods to `src/api/clients`.
- Use builders from `src/builders` for test data.
- Register created articles and comments with cleanup fixtures.
- Use Playwright role, placeholder, text, or test id locators when the application exposes a stable contract.
- Keep unavoidable CSS selectors inside page objects, not specs.
- Use web-first assertions such as `toBeVisible`, `toHaveText`, and `toContainText`.
- Keep E2E specs focused on user-visible behavior.
- Use API setup for expensive or incidental data preparation.
- Keep visual snapshots stable by controlling viewport, locale, timezone, color scheme, and animation behavior.
- Run `npm run check:secrets` before publishing changes.

## Don't

- Do not commit `.env`, `.auth`, reports, traces, screenshots, videos, or local review artifacts.
- Do not add source-code defaults for `BASE_URL`, `API_URL`, or credentials.
- Do not use `page.waitForTimeout()` as synchronization.
- Do not put broad CSS selectors directly in specs.
- Do not silently ignore cleanup failures.
- Do not combine unrelated user journeys into one large test when separate tests would diagnose failures better.
- Do not update visual baselines without reviewing the actual diff.
- Do not log tokens, passwords, authorization headers, or email addresses.
- Do not run broad cross-browser suites for every tiny local change unless the change affects shared browser behavior.
- Do not use public demo services as the long-term CI reliability target.
