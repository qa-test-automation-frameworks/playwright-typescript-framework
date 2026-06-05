# Controlled Test Environment

This framework can point at the public Conduit RealWorld demo, but deterministic CI should use a controlled RealWorld deployment.

The framework code intentionally requires explicit `BASE_URL`, `API_URL`, and shared-user values through `.env`, GitHub Actions variables, or another environment injection mechanism. The repo-owned target wrapper (`npm run with:target` and `npm run verify:target`) is the one exception: it injects fixture-only local target values and generates an ephemeral seed password for that process.

## Required Environment Contract

- `BASE_URL` points to the web application under test.
- `API_URL` points to the matching backend API root.
- `TEST_USER_EMAIL`, `TEST_USER_PASSWORD`, and `TEST_USER_USERNAME` identify a pre-seeded user.
- The pre-seeded user must already exist. Global setup does not auto-register shared credentials.
- The API supports article create, read, update, delete, comments, profiles, follow, and feed endpoints.
- The environment allows generated article/comment data to be created and deleted during tests.

## Readiness Gate

Run this before executing tests:

```bash
npm run check:env
```

The readiness check validates:

- UI endpoint returns a non-error status.
- API `/articles?limit=1` endpoint returns a non-error status.
- 5xx service responses fail fast before noisy test failures are produced.

## Recommended CI Target

For portfolio-grade execution, use one of these options:

- A hosted RealWorld environment owned by the repository owner.
- The checked-in Docker Compose harness after setting `REALWORLD_API_IMAGE` and `REALWORLD_WEB_IMAGE` to compatible application images.
- A persistent staging environment with a resettable database and a dedicated test account.

The public `demo.realworld.show` and `api.realworld.show` endpoints are acceptable for exploratory local runs only. They are not a deterministic CI contract because availability, data persistence, rate limits, and server behavior are outside this repository's control.

## Docker Compose Harness

The included `docker-compose.yml` provides a controlled database plus configurable API and web containers:

```bash
REALWORLD_API_IMAGE=your-realworld-api:latest \
REALWORLD_WEB_IMAGE=your-realworld-web:latest \
docker compose up -d
```

Then configure:

```bash
BASE_URL=http://localhost:4100
API_URL=http://localhost:3000/api
TEST_USER_EMAIL=replace-with-seeded-user@example.test
TEST_USER_PASSWORD=replace-with-seeded-password
TEST_USER_USERNAME=replace_with_seeded_username
```

The API image must expose the RealWorld `/api` contract used by the tests. The web image must render the Conduit UI against the API service. Seed the shared test user before running `npm run verify`; for the repo-owned target use `npm run verify:target` so the wrapper injects fixture-only target values. Generated users/articles are created during tests and article/comment resources are cleaned automatically.

## Data Lifecycle

- Tests generate unique users and articles through builders.
- Tests register cleanup actions through the test-scoped cleanup fixture.
- Cleanup treats HTTP 404 as already-clean.
- Other cleanup failures are reported and fail the test instead of being silently suppressed.
