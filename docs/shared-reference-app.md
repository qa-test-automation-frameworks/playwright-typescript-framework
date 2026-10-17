# Shared reference application pilot

The framework keeps its existing Conduit projects and adds a separate Chromium
pilot for the quality reference application. Its A07 compatibility run builds
public APP source at immutable commit
`251f4452baeb9e33b85c04024a6ebf86ccf32fe7` with fixture `v0.1.0` in the
isolated job. This enables verification of the proposed v2 behavior before it
is merged or published. Readiness checks fail if the service reports another
source revision or fixture. The original A03 target was the
published image from source `e9f438e06a2b092dccfc6e9ab1820ff2562ddad7` and
image digest `sha256:284ae3fa4f2a31a4322b74a6f37e38f0d101879389c656bf1d553df7ec616469`;
anonymous pullability is tracked separately because the registry package is
currently private; the A07 source-build path does not claim to prove package visibility.

`tests/shared-app/reference-application.spec.ts` covers member claim submission,
reviewer approval, API v2 limit display and boundary submission, concurrent
member-context isolation, and an axe scan. It captures a landing-page screenshot
in the test artifact for visual review. The screenshot is currently a review
artifact rather than a pixel baseline comparison; the existing Conduit visual
suite remains unchanged. Selectors use accessible labels and roles, so a
renamed control fails the critical journeys.

CI runs this pilot as its own required job. Its ephemeral Postgres and app
services are isolated to that job; the namespace includes the workflow run and
attempt. The A07 evidence record identifies the immutable source commit and fixture
version; it does not claim an image digest or anonymous package pullability.

## Run locally

Requirements: Node.js `24.21.0`, npm `10.9.4`, Docker Engine with Compose v2,
OpenSSL, and Git access to the public APP repository. Check out the immutable
app source commit before starting Compose:

```bash
git clone https://github.com/qa-test-automation-frameworks/quality-reference-application.git .reference-app
git -C .reference-app checkout 251f4452baeb9e33b85c04024a6ebf86ccf32fe7
export APP_SOURCE_REVISION=251f4452baeb9e33b85c04024a6ebf86ccf32fe7
export COMPOSE_PROJECT_NAME="pw-reference-$(openssl rand -hex 6)"
export APP_NAMESPACE="pw-$(openssl rand -hex 8)"
export APP_POSTGRES_PASSWORD="$(openssl rand -hex 32)"
export APP_PORT=4310
npm ci
npx playwright install chromium
docker compose -f docker-compose.shared-app.yml up -d
export SHARED_APP_BASE_URL="http://127.0.0.1:${APP_PORT}"
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
