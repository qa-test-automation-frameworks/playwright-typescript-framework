# Verification Status and Historical Results

## Latest main-branch run observed — 2026-10-17

At the time of this review, the default-branch CI run was
[`38997501017`](https://github.com/qa-test-automation-frameworks/playwright-typescript-framework/actions/runs/38997501017)
on `main` at `18c2f01d23f344c3334d3418cae12f72095b4cfb`; it completed
successfully on 2026-10-17. For a newer run, inspect the
[live evidence dashboard](https://qa-test-automation-frameworks.github.io/.github/)
and follow the Playwright source-run link.

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
