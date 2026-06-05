# Contributing to Playwright TypeScript Framework

Welcome! This repository is built to professional, FAANG-level engineering standards. Please review our architectural guidelines before submitting code changes.

## Development Checklist

To maintain framework integrity, all changes must comply with:

- **Strict TypeScript Typing:** Never use `any` type annotations. All API client structures must validate responses against strict `zod` schemas.
- **Unified Fixtures:** Never import `test` or `expect` from `@playwright/test` directly in specs. Always import from `@src/fixtures`.
- **Accessible Locators:** Prefer Playwright's `getByRole`, `getByPlaceholder`, `getByText`, or custom `data-testid` selectors. CSS selectors are allowed only when the target application has no accessible contract for repeated content such as article cards, comments, or legacy Bootstrap containers. Keep those selectors centralized inside Page Objects, not specs.
- **Scenario Fixtures:** Prefer typed scenario fixtures for registered users, article owners, published articles, and follower pairs when a test needs domain setup.
- **Observed Steps:** Use `observedStep()` for long user journeys so Playwright reports and optional OpenTelemetry traces share the same workflow anatomy.
- **Explicit Cleanup:** Register created resources with cleanup helpers and fail on cleanup errors. Do not silently swallow cleanup failures except for already-absent resources.
- **Stable Waits:** Prefer URL, locator, text, or state-specific waits. Do not add generic sleeps or broad load-state waits for SPA interactions.
- **Conventional Commits:** Write clean, structured commit messages in the Conventional Commits format:
  ```text
  feat(api): add profile social relationship endpoints
  fix(pom): correct locator for dynamic sidebar tags
  test(e2e): implement social network follow journey
  ```

## Working with the Codebase

### Code Styles and Linting

Check ESLint compliance and Prettier styles using npm scripts:

```bash
# Check code syntax and rules
npm run lint
npm run check:runtime

# Auto-format files
npm run format

# Verify TypeScript type compilation
npm run type-check
```

### Running the Test Suite

Ensure your tests pass locally:

```bash
# Run all tests
npm run test

# Run only API checks
npm run test:api

# Run E2E functional checks
npm run test:e2e

# Run smoke tests
npm run test:smoke
npm run test:otel
```
