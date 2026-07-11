# Current Verification Record

| Field              | Value                                                                                              |
| ------------------ | -------------------------------------------------------------------------------------------------- |
| Repository ref     | `main` (refresh after the next default-branch verification)                                        |
| Fast/full gate     | `ci.yml` — format, types, API, E2E, visual, accessibility, selector, and browser checks            |
| Current state      | `evidence-stale`; the last committed record is older than the 36-hour portfolio freshness window   |
| Target/environment | Repo-owned Conduit-compatible controlled target on port 4300                                       |
| Evidence class     | Controlled, repository-owned target                                                                |
| Report             | [Allure history](https://qa-test-automation-frameworks.github.io/playwright-typescript-framework/) |
| Known limitations  | [Known issues](../known-issues.md) and [controlled environment](../CONTROLLED_TEST_ENVIRONMENT.md) |

The next verification update must include the exact commit SHA, workflow run URL,
completion time, platform matrix, pass/retry counts, report URL, artifact-retention
note, and the boundary between this controlled target and an independently deployed
product.
