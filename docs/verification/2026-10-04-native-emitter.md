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

## First remote run and checkout repair

Actual7e8b55a [CI37208052196](https://github.com/qa-test-automation-frameworks/playwright-typescript-framework/actions/runs/37208052196)
is terminal failed. Tested checkout05a2a9152fc588b4e16aa24abe4cb7de90dd39be
is the native PR merge SHA, separate from delivered source7e8b55a. Negative-control
job succeeded: one real unexpected native case and a valid failed version3 record,
publication pending. Unit21 cases passed, but collection failed at git diff;
downstream suites/report skipped, and required-ci correctly failed. This is not
full emitter verification or browser success. Native failed log/control record kept.

Checkout logs show Git2.43.0 and a real detached merge checkout in the container.
The same git-diff warning was reproduced locally using Git's different-owner test
mode; checkout's temporary HOME/global safe-directory config does not certify later
steps. The targeted helper now sets safe.directory only to the exact canonical
checkout for each invocation, verifies its root/SHA, and rejects dirty tracked
source without executing external diff/textconv helpers. No wildcard/global trust
or fallback to a declared environment SHA. A native temporary-repository regression
verifies initial ownership rejection, repaired exact path and wrong/dirty-source
rejection. Local19 controls pass after that repair. Additional controls reject
invalid native calendar times, wrong scope projects and setup-only business proof.
New exact-revision CI remains required; completed37208052196 must not be restarted.
