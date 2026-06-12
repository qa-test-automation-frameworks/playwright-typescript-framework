# Changelog

## Unreleased

### Added

- Reviewer Proof block with direct links to CI, reports, releases, documentation,
  repository activity, and failure evidence.
- Machine-readable runtime and retry metrics.
- Expiring quarantine policy and validation.
- Fresh-clone line-ending policy for Windows and Linux.
- Controlled-target realism and external-compatibility documentation.

### Changed

- CI retries are limited to one attempt for UI projects. Deterministic API,
  visual, accessibility, and selector-contract projects do not retry.
