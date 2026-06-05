# ADR-003: Hybrid API + UI Test Automation Strategy

## Status

Accepted

## Context

Pure end-to-end browser tests are notoriously slow, fragile, and prone to random flakiness (e.g. slow animations, intermittent loading states). To keep build pipelines running under a few minutes while maintaining maximum confidence, we need to balance testing across multiple layers.

## Decision

We adopted a **Hybrid API + UI testing strategy** modeled after Google and Meta testing cultures.

### Comparison of Patterns

- **Pure UI Approach:** Test registers a user via UI, logs in via UI, navigates to feed, creates article via UI, opens page, and asserts. This flow takes ~15–20 seconds and introduces 5 distinct UI interaction points that can fail due to network hiccups.
- **Hybrid API + UI Approach:** Test leverages a fast, pre-authenticated API context to inject the article in a `beforeEach` hook (~300ms), and then uses the browser ONLY to navigate to the exact article URL and assert UI-specific interactions (like editing or viewing).

### Time Saving Breakdown

| Operation             | Pure Browser (UI) | API Request | Speedup        |
| --------------------- | ----------------- | ----------- | -------------- |
| Authenticate / Log In | ~4,200 ms         | ~300 ms     | **14x faster** |
| Create Article / Post | ~5,500 ms         | ~450 ms     | **12x faster** |
| Post a Comment        | ~3,800 ms         | ~200 ms     | **19x faster** |

## Test Philosophy: Testing Pyramid vs. Testing Trophy

While Kent C. Dodds' Testing Trophy prioritizes integration-level tests, for a portfolio SDET framework, we strictly apply the **Testing Pyramid**:

1. **API Layer (Unit/Integration):** Fast, comprehensive, authoritative. Validates edge cases, schemas, contract responses, and HTTP response codes.
2. **E2E Browser Layer (Functional):** Coarse-grained, user-focused. Validates critical user journeys (e.g., registration -> post -> comment -> profile) from the perspective of an actual user.
3. **Visual Regression Layer (Smoke):** Visual stability checks. Verifies CSS layouts, component formatting, and responsive designs against snapshots.

## Consequences

### Positive (Benefits)

- **High Suite Speed:** 30+ tests complete in less than a minute.
- **Improved Stability:** Minimizes UI browser interactions to the absolute essential targets, avoiding flakiness.
- **Decoupled Setup:** Creates isolated, fresh test preconditions for every spec without database clutter.

### Negative (Drawbacks)

- **Increased Setup Logic:** Requires building parallel API client structures that map to UI operations.
- **State Coordination:** Test engineers must map API models and POM elements to the same logical entities.
- **Credential Storage:** Requires secure access to API tokens and user keys.
