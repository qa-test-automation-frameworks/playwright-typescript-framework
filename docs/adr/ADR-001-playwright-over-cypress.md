# ADR-001: Choosing Playwright Over Cypress for Test Automation

## Status

Accepted

## Context

We need a robust, scalable, and modern TypeScript test automation framework for the Conduit RealWorld web application. The target codebase requires highly reliable UI interaction checks, fast integration-level REST API checks, and visual regression (screenshot) validations. We evaluated Cypress and Playwright to determine the most future-proof choice for high-volume automated checking.

## Decision

We decided to adopt **Playwright** as our primary test automation runner and tool.

## Technical Advantages of Playwright's Architecture

Unlike Cypress, which runs inside the browser's execution loop alongside the application code under test (sharing a single thread), Playwright controls browser engines out-of-process via the Chrome DevTools Protocol (CDP) and standard W3C WebDriver BiDi endpoints.

- **Process-Level Isolation:** Playwright spawns each test worker in a separate operating system process, ensuring complete memory and execution isolation. This eliminates memory leaks and cross-test contamination.
- **Browser Contexts:** Playwright can run multiple isolated browser contexts (similar to incognito profiles) within a single browser instance. Creating a context takes milliseconds (compared to starting a new browser instance in Cypress), enabling high parallelization.
- **First-Class Multi-Browser Support:** Native support for Chromium, WebKit (Safari engine), and Firefox without fragile wrapper integrations.
- **Native TypeScript & ESM support:** Runs files directly with standard native compilation.

## Consequences

### Positive (Benefits)

- **True Parallelism:** Runs hundreds of tests across dozens of parallel OS processes, drastically reducing suite run time.
- **Zero Iframe Limitations:** Seamlessly interacts with multi-origin frames and tabs.
- **Built-in API Contexts:** Standardizes the hybrid testing model (API context setups + UI assertions) out of the box.
- **Built-in Visual Regressions:** Playwright provides native pixel-match screenshot comparison matchers (`expect.toHaveScreenshot`) without expensive third-party plug-in overhead.
- **Robust Network Interception:** Allows mocking and modifying HTTP requests on a browser level directly.

### Negative (Drawbacks)

- **Learning Curve:** Requires engineers to understand asynchronous flow controls (async/await) and locator-based promise structures.
- **Dashboard Service:** Doesn't feature an official, free SaaS cloud dashboard for report analysis like Cypress Cloud, although Allure and standard HTML reports mitigate this.
