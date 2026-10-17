# Shared reference application pilot

The framework keeps its existing Conduit projects and adds a separate Chromium
pilot for the public quality reference application. The pilot pins application
source `e9f438e06a2b092dccfc6e9ab1820ff2562ddad7`, image
`ghcr.io/qa-test-automation-frameworks/quality-reference-application@sha256:284ae3fa4f2a31a4322b74a6f37e38f0d101879389c656bf1d553df7ec616469`,
and fixture `v0.1.0`. The readiness check fails if the running service reports
another source revision or fixture.

`tests/shared-app/reference-application.spec.ts` covers member claim submission,
reviewer approval, concurrent member-context isolation, and an axe scan. It
captures a landing-page screenshot in the test artifact for visual review. The
screenshot is currently a review artifact rather than a pixel baseline
comparison; the existing Conduit visual suite remains unchanged. Selectors use
accessible labels and roles, so a renamed control fails the critical journeys.

CI runs this pilot as its own required job. Its ephemeral Postgres and app
services are isolated to that job; the namespace includes the workflow run and
attempt. The evidence record includes the exact OCI digest and fixture version.
The job pulls the image without registry credentials, so it also verifies that
the published target is anonymously accessible.

## Run locally

Requirements: Node.js `24.21.0`, npm `10.9.4`, Docker Engine with Compose v2,
OpenSSL, and the pinned image's anonymous pull access.

```bash
export COMPOSE_PROJECT_NAME="pw-reference-$(openssl rand -hex 6)"
export APP_NAMESPACE="pw-$(openssl rand -hex 8)"
export APP_POSTGRES_PASSWORD="$(openssl rand -hex 32)"
export APP_PORT=4310
npm ci
npx playwright install chromium
docker compose -f docker-compose.shared-app.yml up -d
export SHARED_APP_BASE_URL="http://127.0.0.1:${APP_PORT}"
export APP_SOURCE_REVISION=e9f438e06a2b092dccfc6e9ab1820ff2562ddad7
export APP_FIXTURE_VERSION=v0.1.0
node scripts/wait-shared-app.mjs
npm run test:shared-app
docker compose -f docker-compose.shared-app.yml down --volumes --remove-orphans
unset COMPOSE_PROJECT_NAME APP_NAMESPACE APP_POSTGRES_PASSWORD APP_PORT
unset SHARED_APP_BASE_URL APP_SOURCE_REVISION APP_FIXTURE_VERSION
```

The Compose profile binds the app only to host loopback and keeps Postgres on
an internal network. It generates a run-specific test-control token inside the
app container. Its database is disposable. If a test command fails, still run
the final `docker compose down` command to remove containers and networks.
