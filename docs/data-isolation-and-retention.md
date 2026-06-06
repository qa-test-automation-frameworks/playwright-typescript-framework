# Data Isolation and Retention

This framework is designed for a repo-owned controlled Conduit-compatible target. Tests must remain safe under `fullyParallel: true` and under scheduled CI runs.

## Isolation Rules

- Test data builders generate unique users, article titles, tags, and comments.
- `TEST_RUN_ID` is included when available so CI-created data can be traced to a run.
- Scenario fixtures create users and articles through API clients instead of depending on execution order.
- Deletable resources are registered with the test-scoped cleanup fixture immediately after creation.
- Cleanup runs in reverse registration order and tolerates already-absent API resources.

## Non-Deletable Users

The Conduit-compatible API does not expose user deletion. User accounts created for tests are therefore treated as retained test data.

Controls:

- Use unique generated usernames and emails for every test-created user.
- Keep generated users isolated from shared seed credentials.
- Store no reusable credentials in source-controlled files.
- Reset the controlled target with `npm run target:seed` for local deterministic runs.
- Prefer the repo-owned controlled target for CI so retained users do not pollute shared external environments.

## Cleanup Expectations

Tests that create articles, comments, favorites, or follow relationships should register cleanup through the `cleanup` fixture in the same test that created the resource.

Examples:

- Articles are registered with `cleanup.registerResource('article', slug, () => articleApi.deleteArticle(slug))`.
- Follow relationships are registered with `cleanup.registerResource('follow relationship', username, () => profileApi.unfollowUser(username))`.
- Comments are normally removed by article deletion; standalone comment cleanup should use the comment API when an article must remain.

## External Environment Policy

External RealWorld-compatible deployments are supported only when `BASE_URL`, `API_URL`, and seed credentials are provided explicitly. Do not run destructive or high-volume suites against shared environments without an agreed retention policy.
