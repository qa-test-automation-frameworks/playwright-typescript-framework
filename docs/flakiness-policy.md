# Flakiness Policy

This framework treats retries as diagnostic evidence, not as a permanent fix.

## Local Report

After any Playwright run that writes `test-results/results.json`, generate a retry summary:

```bash
npm run flake:report
```

The command writes `test-results/flake-report.md`. A clean run reports zero tests with retries or unexpected outcomes. A noisy run lists the project, spec, final outcome, retry count, and failed-attempt count.

## Triage Rules

- A test that passes only after retry must be investigated before broadening coverage around the same flow.
- A repeatedly flaky test should be quarantined only with a linked issue and a bounded owner/date.
- Selector, readiness, and fixture-isolation fixes are preferred over increasing timeouts.
- Network interception and controlled-target seeding should be used for deterministic failure states.

## CI Evidence

CI uploads `test-results/` artifacts for every test job. Those artifacts include the JSON result file and any generated flake report, allowing reviewers to inspect retry history alongside Allure and Playwright HTML output.
