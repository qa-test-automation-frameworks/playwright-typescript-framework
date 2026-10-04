# Supported runtime verification

Node24.21.0/npm10.9.4 now agrees across both version files, engines, normal
preinstall guard, CI and contributor setup. The Compose target uses the official
Node24.21.0-alpine multi-platform registry digest
`sha256:ebfe2f90462722a7a4de65e91990e97fe0d401c70e0e762c5b53302f905ec1c1`,
verified from the publisher registry, and explicitly installs npm10.9.4.
The Playwright1.60.0 browser image stays unchanged; CI setup-node selects the
framework runtime inside it. All non-root locked dependency entries remain
byte-for-byte equivalent as parsed objects. Native npm regenerated only root
installation/engine metadata. Dependency and browser upgrades remain separate.

## Actual verification

- Normal frozen installation runs the runtime guard and Husky preparation.
  Existing21 diagnostic/publication unit tests, lint, type checking and formatting
  pass on Node24.21.0/npm10.9.4.
- The owned-target API run passed32 runner cases, including setup/teardown, with
  the unchanged assertions. Target runner returned exit0; no public load was sent.
- Actual Node18.19.1, Node24.19.0 and npm11 executions returned exit1 with the
  pinned bootstrap instruction. These are actual tool checks, not spoofed Node
  version strings. Future supported Node patches are policy, not executed proof.
- Actionlint1.7.7 passed the changed CI workflow; optional ShellCheck/Pyflakes
  integrations were disabled and no coverage from them is asserted.

## Clean checkout and repeat execution

A disposable local clone of the preceding head received the exact runtime patch
and new policy document. No node_modules existed, and the isolated npm cache was
new and empty. A stripped shell environment and distinct empty user/global npm
configuration files prevented inherited project secrets/npm configuration.
Normal `npm ci --no-audit` ran lifecycle hooks. The published no-secret sequence
`npm run test:unit`, `npm run lint`, `npm run type-check` passed twice,21 cases
on each invocation. The unit runner supplies synthetic identities and fake
contexts. No browser download, Docker, target, .env or API key was required.
The runtime/npm binaries were preprovisioned prerequisites; dependency downloads
required network access. Full elapsed wall time was not instrumented and is not
claimed; native unit durations and npm installation output are retained.

Native logs, registry response and source hashes are under
`evidence/2026-10-04-runtime/`. Exact-revision [CI37201420831](https://github.com/qa-test-automation-frameworks/playwright-typescript-framework/actions/runs/37201420831)
completed successfully at5040a09e5f750e854c7db2b256a3d6f0bcdf017b. Native API
metadata records successful Linux/Windows fresh-clone checks, lint/unit/type gate,
API, both E2E and visual shards, accessibility, selector contracts, cross-browser
smoke and Allure rendering. The scheduled full cross-browser job and PR public
publication were skipped; neither is inferred from this run. Native run/jobs/artifact
metadata is retained. This verifies the source change at5040a09, with subsequent
evidence-only documentation distinct from the tested revision. Local Docker is
unavailable, so resolving the target image is not actual container execution proof.
Portfolio-wide R01/R03 and security/feature currency remain separate work.
