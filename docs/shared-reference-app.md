# Shared reference application pilot

The framework keeps its existing Conduit projects and adds a separate Chromium
pilot for the quality reference application. The A07 compatibility job pulls
the published v0.2.0 image by immutable digest
`sha256:0de7875e9c69d3e6f8954456b6f7c90160032395f87aee4d3d64e33307b062a9`
(source `e90067b38bcd88fbb9118388f9fb8cc9dee6d493`) with fixture `v0.1.0`.
This artifact was published after the app-guide merge; its product source is
unchanged from the versioned v2 application, and the OCI label is checked
before the service's source and fixture identity. The image is public and
supports `linux/amd64` and `linux/arm64`; the job tests its runner's platform.
The [post-merge app verification and image-publish run](https://github.com/qa-test-automation-frameworks/quality-reference-application/actions/runs/39036763813)
records this digest and source revision.

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

A second required job boots the previously verified `0.1.0` rollback image by
its immutable digest in a separate disposable environment. It checks the OCI
source label and readiness identity, then creates a synthetic member session,
reads the v1 policy, accepts a $10,000 claim, and rejects a claim one cent over
the v1 limit. The job uploads a compact result summary. This proves the pinned
recovery artifact still serves the old contract; it does not change or roll
back any deployed environment or persisted data.

## Run locally

Requirements: Node.js `24.21.0`, npm `10.9.4`, Docker Engine with Compose v2,
OpenSSL, and anonymous pull access to the public GHCR image. Pull and verify the
immutable image before starting Compose:

```bash
export APP_IMAGE='ghcr.io/qa-test-automation-frameworks/quality-reference-application@sha256:0de7875e9c69d3e6f8954456b6f7c90160032395f87aee4d3d64e33307b062a9'
export APP_IMAGE_DIGEST='sha256:0de7875e9c69d3e6f8954456b6f7c90160032395f87aee4d3d64e33307b062a9'
export APP_SOURCE_REVISION=e90067b38bcd88fbb9118388f9fb8cc9dee6d493
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
