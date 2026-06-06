# Configuration Guide

## Requirements

- Node.js `20.x`, matching `.nvmrc`, `.node-version`, and `package.json`.
- npm `10+`.
- Playwright browsers installed for the projects being run.
- A Conduit RealWorld-compatible UI and API target.

## Local Setup

```bash
npm ci
npx playwright install chromium
cp .env.example .env
```

Update `.env` with explicit target URLs and a pre-seeded test user.

## Required Environment Variables

| Variable                      | Purpose                                                |
| ----------------------------- | ------------------------------------------------------ |
| `BASE_URL`                    | UI base URL used by Playwright browser tests.          |
| `API_URL`                     | API base URL used by API clients and readiness checks. |
| `TEST_USER_EMAIL`             | Email for the shared seeded test user.                 |
| `TEST_USER_PASSWORD`          | Password for the shared seeded test user.              |
| `TEST_USER_USERNAME`          | Username for the shared seeded test user.              |
| `OTEL_ENABLED`                | Set to `true` to export OpenTelemetry spans.           |
| `OTEL_SERVICE_NAME`           | Service name used for trace resource attributes.       |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | OTLP HTTP trace endpoint.                              |
| `OTEL_TRACE_CONSOLE`          | Set to `true` to also print spans to stdout.           |
| `OTEL_RESOURCE_ATTRIBUTES`    | Extra resource attributes as `key=value,...`.          |

The framework intentionally has no source-code defaults for these values. `src/utils/config.ts` fails fast when any value is missing or invalid.

## Optional Environment Variables

| Variable         | Purpose                                                              |
| ---------------- | -------------------------------------------------------------------- |
| `DEBUG_API=true` | Enables redacted API request and response logging.                   |
| `TEST_RUN_ID`    | Prefixes generated test data for easier cleanup and CI traceability. |
| `CI=true`        | Enables CI retry and worker settings from Playwright config.         |

## GitHub Actions Configuration

Configure repository variables:

- `BASE_URL`
- `API_URL`

Configure repository secrets:

- `TEST_USER_EMAIL`
- `TEST_USER_PASSWORD`
- `TEST_USER_USERNAME`

The CI workflow injects these values into environment readiness checks and all test jobs.

## Controlled Test Environment

For deterministic CI, point `BASE_URL` and `API_URL` at a controlled RealWorld deployment. Public demo endpoints are acceptable for exploratory local runs only because availability, data persistence, rate limits, and contract drift are outside this repository's control.

`docker-compose.yml` provides a repo-owned Conduit-compatible target on port `4300`. Set `TEST_USER_EMAIL`, `TEST_USER_PASSWORD`, and `TEST_USER_USERNAME` explicitly before starting the stack, then point `BASE_URL` to `http://127.0.0.1:4300` and `API_URL` to `http://127.0.0.1:4300/api`.

## Ignored Local Artifacts

Do not commit `.env`, `.auth`, Playwright reports, Allure results, screenshots, videos, traces, or local review artifacts. These paths are covered by `.gitignore`.
