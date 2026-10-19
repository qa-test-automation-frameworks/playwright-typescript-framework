# Verification Status and Historical Results

## Latest main-branch run observed — 2026-10-19

The independent AI-assisted fresh-clone review on 2026-10-19 checked
`main` at `caebfb104223c2ef285c451c0ab75532655d0d44` and followed the linked
default-branch run
[`39230687804`](https://github.com/qa-test-automation-frameworks/playwright-typescript-framework/actions/runs/39230687804).
The reviewer reported that the run completed successfully and its listed
artifacts were available. This is the latest run verified in that review, not
a guarantee that it remains the latest; inspect the
[live evidence dashboard](https://qa-test-automation-frameworks.github.io/.github/)
and follow the Playwright source-run link for current status.

The detailed counts below are from the retained July run, not run `38997501017`.
They are kept as historical context and are not a current suite summary.

## Historical run — 2026-07-11

| Field              | Value                                                                                                                                                                                                                                                                          |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Repository ref     | `main` @ [`07c1c50`](https://github.com/qa-test-automation-frameworks/playwright-typescript-framework/commit/07c1c5053ab26044805a336c5b39bc5bc3096720)                                                                                                                         |
| Fast/full gate     | [`ci.yml` run 29139295982](https://github.com/qa-test-automation-frameworks/playwright-typescript-framework/actions/runs/29139295982) — format/lint/type-check, API, e2e, cross-browser, selector-contract, accessibility, and visual projects; completed 2026-07-11T04:18:20Z |
| Record status      | Historical; superseded by later main-branch CI                                                                                                                                                                                                                                 |
| Target/environment | Repository-owned Conduit-compatible target                                                                                                                                                                                                                                     |
| Evidence class     | Controlled                                                                                                                                                                                                                                                                     |
| Historical counts  | 93 tests across 8 projects, 93 expected, 0 unexpected, 0 retries in the retained July run; see `historical-verification.json` for its per-project breakdown                                                                                                                    |
| Report             | [Allure report](https://qa-test-automation-frameworks.github.io/playwright-typescript-framework/)                                                                                                                                                                              |
| Known limitations  | [Known issues](../known-issues.md)                                                                                                                                                                                                                                             |

The machine-readable record with the exact SHA, run ID/URL, conclusion, and
per-project result counts is retained at
[`historical-verification.json`](historical-verification.json).
