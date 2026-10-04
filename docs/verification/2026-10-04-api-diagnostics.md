# API diagnostic redaction — 2026-10-04

The sensitive-key set now uses the same lowercase normalization as lookup.
Nested objects and arrays redact tokens, authorization/cookies and exception
name/message/stack metadata without mutating the input.

The API client logs request metadata (method, origin/path, header count and
body/parameter presence), rather than request payloads or header values. URL
userinfo and query values are omitted from diagnostics. HTTP, malformed-JSON,
schema-validation, transport and response-read errors expose bounded metadata
instead of raw remote text. Transport exceptions are sanitized before the
telemetry wrapper records them.

Body diagnostics retain character count, a fixed allowlist of contract field
names, and static codes for exact known identity-conflict messages. Arbitrary
keys and values remain hidden. This preserves the existing duplicate-email
negative assertion without copying remote free text into errors or reports.
Successful schema-validated data remains available to callers.

## Validation

With Node 24.19.0 and npm 10.9.4:

```sh
npm run test:unit
npm run lint
npm run type-check
npm run format:check
npm run with:target -- npm run test:api
```

The service-free unit command uses the existing Playwright runner with synthetic
configuration and no browser/provider. Fourteen tests cover casing/nesting,
immutability, captured error/debug output, text/JSON failures, query/userinfo,
invalid URL inputs, malformed JSON, schema failures, response read failure, valid caller data,
telemetry's recorded transport exception, and exact allowlisted validation codes.
The owned-target API profile passed all **32 runner cases**, including its setup
and teardown; this is not 32 distinct business assertions.

Unit tests are part of the verify command and CI's lint/typecheck job. Browser
matrices and report-publication repair are separate work packages.

## Limits

This is a bounded diagnostic policy, not proof that no secret can ever be logged.
Callers must use safe log messages, avoid private data in URL path segments, and
handle successful response data responsibly. Generic arbitrary metadata with
unknown key names is not automatically classified as sensitive. Native browser
trace/attachment policies need their own review. Error bodies no longer expose
raw JSON; consumers requiring richer error assertions must use documented safe
codes or independently inspect controlled test responses without publishing them.
