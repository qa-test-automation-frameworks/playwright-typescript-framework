# Browser traces

Browser UI projects keep the existing `on-first-retry` behavior when they are
configured to retry. A browser UI project with zero retries uses
`retain-on-failure`, so the failure still has an inspectable trace. API-only
tests keep their current diagnostics. The standalone shared-application project
retains traces only when `SHARED_APP_SYNTHETIC=1` is set for the owned pinned
fixture; other targets default to trace mode `off`.

Trace archives can contain DOM snapshots, network requests, console output and
page state. Redacting text logs does not sanitize a trace. Repository CI runs
that create traces use owned synthetic targets and keep the archives in
GitHub Actions artifacts for seven days. `prepare-allure-results.js` removes
Playwright trace attachments before rendering the public Allure Pages report;
the archive remains available only in the bounded CI artifact.

For a non-synthetic target, trace collection stays off by default. Do not set
`CONTROLLED_TARGET_MODE=1` or `SHARED_APP_SYNTHETIC=1` for an external target.
Use the dedicated `playwright.trace-control.config.ts` only with its local
synthetic page; its intentionally failing control is excluded from the normal
test suite.
