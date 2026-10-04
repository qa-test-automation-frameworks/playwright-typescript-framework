# Playwright E02 native emitter

Observed gap: successful jobs and short-lived reports did not emit a common native
execution record; blindly merging artifacts obscures missing shards, repeated setup
and retries. Version3 per-scope collection now binds native source/run/attempt/scope,
reconciles native final cases and preserves original runner outcomes. Missing/empty/
invalid input fails collection; publication stays independently pending.

Local actual Node24.21.0 validation:16 adapter/final-gate controls passed,21 native
framework-unit cases passed,32 owned-target API cases passed. The real isolated
negative probe exited1 for E02_EXPECTED_FAILURE_CONTROL and produced exactly one
unexpected native case. Direct native reconciliation confirms those denominators;
these local checks have no fabricated GitHub execution manifest. Lint/type/format
and actionlint1.7.7 passed; optional shell integrations were disabled. Native logs,
reconciled summaries and inspected branch/ruleset state are retained with hashes.

Current CI implementation collects framework-unit, API, both E2E/visual shards,
accessibility, selector-contract, smoke browsers and optional scheduled projects.
Actual new-revision CI/collection/aggregation requires remote verification; existing
5040a09 success does not certify these new emitters. Unit fixtures are explicitly
synthetic controls. Other four framework adapters and E03–E04 remain required.
