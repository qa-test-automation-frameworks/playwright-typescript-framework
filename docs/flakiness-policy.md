# Flakiness Policy

This framework treats retries as diagnostic evidence, not as a passing
equivalent and not as a permanent fix.

## Definitions

- **First-pass pass:** the test passes on attempt zero.
- **Flake:** the test fails and then passes without a relevant code or target change.
- **Infrastructure failure:** the runner, browser installation, registry, or
  checkout fails before the test can make an assertion.
- **Quarantine:** a temporary exclusion recorded in
  `reliability/quarantine.yml` with owner, issue, reason, and expiry.

API, visual, accessibility, and selector-contract projects use zero retries.
UI projects may use one CI retry so a failure retains trace evidence. A retry
still counts against the reliability budget.

## Local Report

After any Playwright run that writes `test-results/results.json`, generate a retry summary:

```bash
npm run flake:report
```

The command writes `test-results/flake-report.md` and
`test-results/portfolio-metrics-v1.json`. The JSON includes run identity, total
tests, unexpected outcomes, accumulated duration, retry count, retry rate, and
policy values.

## Triage Rules

- A test that passes only after retry must be investigated before broadening coverage around the same flow.
- A repeatedly flaky test may be quarantined only with a linked issue, owner,
  reason, and expiry no more than 14 days away.
- Quarantined tests run in scheduled diagnostics and are excluded from claimed
  passing coverage.
- Selector, readiness, and fixture-isolation fixes are preferred over increasing timeouts.
- Network interception and controlled-target seeding should be used for deterministic failure states.

## CI Evidence

CI uploads `test-results/` artifacts for every test job. Scheduled runs execute
`npm run flake:check`, which fails when a deterministic project retries or the
retry rate exceeds `FLAKE_BUDGET_PERCENT` (1% by default).

Hosted-runner setup failures are handled separately. The infrastructure rerun
workflow may rerun failed jobs once only when every failed job stopped in
`Set up job` before checkout. Test, assertion, target, and dependency failures
are never rerun by that workflow.
