# Native execution evidence

CI collects version3 evidence from Playwright's JSON reporter in an always-run
step immediately after each real test step. It records the original runner outcome;
a successful collection/upload cannot clear a failed runner job. Invalid or missing
native input produces unavailable evidence with null counts and fails collection.
Empty or all-skipped execution also fails a nominally successful runner gate.

The metadata binds native input to exact checkout SHA, run ID/attempt and scope.
The collector rejects a dirty tracked checkout, mismatched source/run/attempt/scope,
installed-tool mismatch, missing/duplicate retry attempts or inconsistent native
statistics. It does not fabricate GitHub context for local runs. For local inspection,
`summarizeNative` can reconcile a report without emitting an execution manifest.

## Denominators

Count unique native spec/project parameter cases, including setup and teardown.
`expected` and `flaky` native final outcomes are passed cases; an explicitly expected
failure is a native expected outcome, not an unexpected failing final case. A retried
case counts once; the separate sanitized summary retains attempt statuses and
raw-attempt count. Case IDs are hashed; native test titles, request/error text and
credentials are not copied into manifests. Unknown evidence counts are null.

Sharded scopes declare separate leaf shard identities. Aggregation requires every
expected shard exactly once, identical repository/source/run/attempt/scope/target,
and reconciled leaf summaries. Business-project cases cannot overlap across shards.
Setup/teardown may genuinely run per shard and remain distinct executions in the
aggregate denominator. Do not blindly sum downloaded files or deduplicate genuinely
executed setup cases to make counts look cleaner.

## Target and publication

Controlled target digest covers actual owned-target file bytes, seed implementation
and dependency lock, with normalized path separators. Fixture version is the seed
implementation hash, not a claim that every random generated row is identical.
Environment includes runner OS. Hermetic fakes/probe identify the tested source
revision and contact no target service. The target remains co-versioned with this
framework; this is not the independently pinned shared application planned in A01.

Publication remains pending in the execution record. Uploading CI artifacts does
not prove durable publication or retention beyond expiry; E03 will add trusted
artifact references/checksums and immutable bundles. Required aggregate manifests
are copied into the rendered report without changing report download layout.
Local schema/semantic checker is a self-contained copy of the organization E01
contract with local paths and formatting adapted; origin/version/source hashes
are in scripts/evidence/vendor-provenance.json. No cross-repository runtime fetch.

## Real controlled failure and final gate

`evidence-negative-control` executes a real browser-free Playwright assertion that
must fail with `E02_EXPECTED_FAILURE_CONTROL`, collects one failed final case and
requires that precise assertion reason. Its one intentional runner failure uses
continue-on-error only for this control; the verification steps must succeed.
Normal suites retain ordinary runner failure behavior. No API provider is called.

The `required-ci` job uses always() and requires every mandatory child and renderer
actually to succeed. Only the scheduled full-browser tier may skip on non-scheduled
events; scheduled events require its success. Local controls cover every mandatory
job's failed/cancelled/skipped/missing outcome. These workflow semantics are separate
from repository merge enforcement.

As inspected2026-10-04, main branch protection API returns Branch not protected and
the rulesets API returns an empty list. No protection is claimed enabled. An exact
minimum recipe is in .github/policy/required-ci-branch-protection.json, bound to
GitHub Actions app15368 confirmed from native check-run metadata. Roll out the new
workflow and verify its stable required-ci check on the default branch before
applying that recipe through the branch protection API; preserve any newly existing
settings during rollout rather than blindly replacing them. Required human review
policy and default-branch rollout remain separate decisions/evidence. Current work
is delivered as a draft PR, not merged default-branch configuration.
