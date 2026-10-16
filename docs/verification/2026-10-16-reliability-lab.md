# Playwright controlled fault and repeatability sample

The repository-owned RealWorld target supports five opt-in reliability faults. They are injected only when `scripts/target-runner.js` launches the test target and `RELIABILITY_FAULT` names a known fault. Normal target runs leave every fault disabled.

| Fault           | Controlled change                                           | Intended gate                          |
| --------------- | ----------------------------------------------------------- | -------------------------------------- |
| `selector`      | Changes the article-title test ID returned by the UI.       | Selector contract                      |
| `api-schema`    | Renames the article collection field in the list response.  | API response schema                    |
| `accessibility` | Adds a focusable button hidden from the accessibility tree. | axe accessibility rule                 |
| `visual`        | Changes the controlled target page background.              | Existing home-feed screenshot baseline |
| `cleanup`       | Makes owned article deletion fail with HTTP 503.            | Cleanup fixture failure assertion      |

Run `npm run reliability:faults` to execute each named gate against its matching fault. The command succeeds only when every controlled defect causes a nonzero test result and its diagnostic appears in the captured output. Logs and a machine-readable control summary are written under ignored `work/reliability-lab/`.

Run `npm run reliability:repeat` for 20 independent clean repetitions of the bounded API article-list profile. Each repetition starts a fresh target process, uses one worker, disables retries, and records its native outcome and wall time. The JSON and Markdown summaries include first-attempt failures, retries, skips, runtime versions, and sample limitations. The CI `reliability-lab` job uploads these outputs for each tested revision.

The repetition profile checks that a representative controlled API path is repeatable under the same runner, target, and machine class. Twenty successful samples are a small baseline for observation; they do not establish an extremely low flake rate or predict performance on another environment.
