# Writing Tests

## Test Layout

- API contract tests belong in `tests/api`.
- Browser user flows belong in `tests/e2e`.
- Visual regression checks belong in `tests/visual`.
- Accessibility checks belong in `tests/accessibility`.

Use the existing fixture export from `src/fixtures` so specs receive page objects, API clients, auth state, and cleanup helpers consistently.

## API Tests

API specs should use domain clients from fixtures instead of constructing raw requests in each test.

Recommended pattern:

- Build data with `UserBuilder` or `ArticleBuilder`.
- Call the relevant API client.
- Assert both status-level behavior and response shape.
- Register deletable resources with cleanup when a test creates state.
- Add or update Zod schemas when the API contract changes.

## E2E Tests

Browser specs should express user-visible behavior through page objects.

Recommended pattern:

- Use API clients to prepare incidental data.
- Navigate explicitly in the test or page object method.
- Interact through page object methods.
- Assert with Playwright web-first assertions.
- Keep each test focused on one workflow or product behavior.

Use `chromium-anonymous` for login and registration flows. Use authenticated projects for flows that require the seeded user state.

## Page Objects

Keep locators and interaction details in `src/pages`.

- Prefer role, placeholder, text, and test id locators.
- Keep unavoidable CSS selectors centralized in page objects.
- Return `Locator` objects when tests need direct web-first assertions.
- Avoid exposing implementation details such as local storage keys from high-level tests.

## Test Data

Use builders for data uniqueness and readability. `TEST_RUN_ID` is automatically included by builders when available, which helps identify CI-created data.

Do not reuse static article titles or usernames in stateful tests unless the scenario explicitly needs deterministic text.

## Cleanup

Register created articles and comments with the cleanup fixture. Cleanup failures should fail the test so shared environments do not silently accumulate state.

User accounts cannot be deleted through the public API, so user-generating tests must create unique users.

## Visual Tests

Visual tests should cover stable, high-value pages only.

- Keep the viewport and environment controls from the `visual` Playwright project.
- Prepare data through API clients.
- Avoid dynamic content that changes between runs.
- Review diffs before updating baselines.

## Accessibility Tests

Accessibility tests should wait until the target page is ready, then run Axe through `AxeBuilder`.

Keep scans focused on critical pages and states. If a violation is accepted temporarily, document the reason in the test or associated issue rather than weakening the scan globally.
