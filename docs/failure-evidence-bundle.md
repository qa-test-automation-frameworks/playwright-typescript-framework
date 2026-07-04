# Offline Failure Evidence Bundle

This bundle records representative failure artifacts that can be reviewed without rerunning the suite.

| Evidence | Location | Notes |
| --- | --- | --- |
| Trace reference | `test-results/` artifact from CI job `test-e2e` | Download the artifact for the failed run and open the Playwright trace with `npx playwright show-trace trace.zip`. |
| Visual diff examples | `playwright-report/` artifact from CI job `test-visual` | Includes expected, actual, and diff images for screenshot assertions. |
| Debugging screenshot | `docs/assets/screenshots/debugging-failure.png` | Static example committed for reviewer access. |
| Failure walkthrough | `docs/debugging-test-failures.md` | Explains the triage path and artifact order. |

Retention: CI artifacts are short-lived; this file keeps stable pointers to the committed examples and the exact artifact names produced by the workflows.
