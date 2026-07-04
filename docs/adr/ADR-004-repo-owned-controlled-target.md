# ADR-004: Repo-Owned Controlled Target as Default

## Status

Accepted

## Context

ADR-002 selected the public Conduit RealWorld application as the original target
because it provided realistic UI and API workflows. That decision created a
useful starting point, but public demo targets introduce availability,
state-drift, rate-limit, and contract-drift risks that undermine deterministic
CI evidence.

The framework now includes a repository-owned target under `test-target/` and
uses Playwright projects plus target-runner scripts to exercise that controlled
application by default.

## Decision

The default local and CI target is the repo-owned controlled RealWorld-style
application:

- UI: `test-target/ui.html` served by `test-target/server.ts`
- API: endpoints implemented by `test-target/server.ts`
- Runner: `npm run with:target -- <command>` or the `target-runner` scripts used
  by verification commands

The public Conduit RealWorld app remains useful only as an external compatibility
reference or manual adaptation target. It is not the default source of reviewer
evidence.

## Consequences

### Positive

- CI evidence is deterministic and independent of a public demo site's uptime.
- Test data, authentication state, API semantics, and selector contracts are
  owned by this repository.
- Failure signatures are easier to reproduce because the target and framework
  evolve together.

### Negative

- The target is intentionally smaller than a public multi-user deployment.
- External compatibility still requires an explicit adaptation pass before using
  the framework against another RealWorld implementation.
- Reviewers should treat the controlled target as framework evidence, not as
  proof that the same tests are portable without configuration work.

