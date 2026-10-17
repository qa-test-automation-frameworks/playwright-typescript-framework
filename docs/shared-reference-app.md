# Shared reference application pilot

The framework keeps its existing Conduit projects and adds a separate Chromium
pilot for the quality reference application. The A07 compatibility job now
pulls the published v0.2.0 image by immutable digest
`sha256:88d550587cdb0f07cf5c3b5afad1162641196f07e70afae25f568fb402d73c26`
(source `30375e5250ae33dde6f0041f7a40f2c8af86b40e`) with fixture `v0.1.0`.
Before testing, it checks the image's OCI source-revision label and then checks
the running service's source and fixture identity. The image is public and
supports `linux/amd64` and `linux/arm64`; the job tests its runner's platform.

`tests/shared-app/reference-application.spec.ts` covers member claim submission,
reviewer approval, API v2 limit display and boundary submission, concurrent
member-context isolation, and an axe scan. It captures a landing-page screenshot
in the test artifact for visual review. The screenshot is currently a review
artifact rather than a pixel baseline comparison; the existing Conduit visual
suite remains unchanged. Selectors use accessible labels and roles, so a
renamed control fails the critical journeys.

CI runs this pilot as its own required job. Its ephemeral Postgres and app
services are isolated to that job; the namespace includes the workflow run and
attempt. The A07 evidence record identifies the OCI image digest and fixture
version, while the readiness check separately verifies the source revision.

## Run locally

Requirements: Node.js `24.21.0`, npm `10.9.4`, Docker Engine with Compose v2,
OpenSSL, and anonymous pull access to the public GHCR image. Pull and verify the
immutable image before starting Compose:

```bash
export APP_IMAGE='ghcr.io/qa-test-automation-frameworks/quality-reference-application@sha256:88d550587cdb0f07cf5c3b5afad1162641196f07e70afae25f568fb402d73c26'
export APP_IMAGE_DIGEST='sha256:88d550587cdb0f07cf5c3b5afad1162641196f07e70afae25f568fb402d73c26'
export APP_SOURCE_REVISION=30375e5250ae33dde6f0041f7a40f2c8af86b40e
docker pull "$APP_IMAGE"
test "$(docker image inspect "$APP_IMAGE" --format '{{ index .Config.Labels "org.opencontainers.image.revision" }}')" = "$APP_SOURCE_REVISION"
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
unset SHARED_APP_BASE_URL APP_IMAGE APP_IMAGE_DIGEST APP_SOURCE_REVISION APP_FIXTURE_VERSION
```

The Compose profile binds the app only to host loopback and keeps Postgres on
an internal network. It generates a run-specific test-control token inside the
app container. Its database is disposable. If a test command fails, still run
the final `docker compose down` command to remove containers and networks.
