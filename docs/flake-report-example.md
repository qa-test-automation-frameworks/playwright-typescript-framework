# Flake Report Example

This is the expected shape of `test-results/flake-report.md` when a Playwright JSON result has no retries or unexpected outcomes.

```markdown
# Flake Report

Total tests inspected: 42
Tests with retries or unexpected outcomes: 0

No retries or unexpected outcomes were recorded in this run.
```

When retries or unexpected outcomes are present, the generated report includes project, spec, outcome, retry count, and failed-attempt count so the team can triage unstable tests without opening raw JSON.
