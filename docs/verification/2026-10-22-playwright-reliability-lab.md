# Playwright native fault and repeat evidence — 22 October 2026

The [hosted reliability run](https://github.com/qa-test-automation-frameworks/playwright-typescript-framework/actions/runs/39715762319) tested PR #66 head `3266cb188890b4c69b873daa6c3fec49bdbeb874` on the PR merge checkout `cbe8b1212eee5ef8bf1db5c4600bcdc052ec7928`, based on `9b5a63fbf571884b2b12be5b62549da1ccd5adf1`. The controlled target tree was `ab836d4debc1ebd6e9ac51644788cf9aa2b7732c`. The runner used Node 24.21.0, Playwright 1.64.0, Windows Server 2025 x64, four logical CPUs, and 17,174,360,864 bytes of RAM.

## Native fault controls

All five controls had a clean pass and the intended mutated failure. Each clean and mutated run reported three native cases (setup, selected test, and teardown).

| Fault         | Native selected case                                                            | Mutated result                                                              |
| ------------- | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Selector      | `selector-contract` — `feed exposes article-card selector surfaces @contract`   | `DETECTED`, selector assertion                                              |
| API schema    | `api` — `List articles with tag filter @api`                                    | `DETECTED`, response-schema metadata                                        |
| Accessibility | `accessibility` — `Login page has no detectable WCAG violations @accessibility` | `DETECTED`, axe rule `aria-hidden-focus`                                    |
| Visual        | `visual` — `Home feed matches baseline @visual`                                 | `DETECTED`, with a valid committed baseline and expected/actual/diff images |
| Cleanup       | `api` — `Get article by slug @api`                                              | `DETECTED`, fixture-teardown metadata                                       |

The compact count is **5 detected, 0 missed, 0 invalid**. Attribution used the native JSON testcase identity, process exit, structured failure metadata or required image attachments; captured console text alone was not treated as proof.

## Bounded repeat sample

The existing one-worker, zero-retry API list-articles profile ran 20 times against a fresh repository-owned target process per sample. All 20 runs passed their three native setup/test/teardown cases: 60 native cases total, with zero first-attempt failures, retries, or skips. The accumulated wall time was 80.06 seconds.

The raw per-run wall times, minimum, and maximum are retained in the [sanitized evidence JSON](evidence/playwright-reliability-lab-39715762319.json). The raw central pair averages to 3.9955 seconds; the original artifact rounded that midpoint to 3.995 because of a floating-point tie. This PR corrects the millisecond formatter and adds a regression; the rounded display is 3.996 seconds. The timings themselves are unchanged. No p95 or tail-precision claim is made.

The Actions artifact `playwright-reliability-lab` (ID `12398832474`) retains the native JSON and attachment inventory. Its SHA-256 is `5ca07b1c51f4b8409f3585155faed6931213607a56b80e0ad5ae47b2528c7bdd`. Raw traces, screenshots, and per-test reports are not copied into the repository.

**Decision:** retain the one-worker, zero-retry API profile. These 20 runs on one hosted Windows runner and one controlled target do not estimate a production flake rate, predict another runner class, or establish browser repeatability. The separate [Selenium Grid capacity result](https://github.com/qa-test-automation-frameworks/selenium-testng-java-framework/pull/59) covers session creation and cleanup, not this API repeat profile.
