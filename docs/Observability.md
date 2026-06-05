# Observability

OpenTelemetry is optional and vendor-neutral. Normal local and CI runs keep telemetry disabled unless `OTEL_ENABLED=true` is set.

## Local Trace Stack

```bash
npm run observability:up
npm run test:otel
npm run observability:down
```

The Docker Compose observability profile starts:

- OpenTelemetry Collector on `http://127.0.0.1:4318/v1/traces`.
- Jaeger UI on `http://127.0.0.1:16686`.

## Environment Variables

| Variable                      | Default                           | Purpose                                      |
| ----------------------------- | --------------------------------- | -------------------------------------------- |
| `OTEL_ENABLED`                | `false`                           | Enables SDK initialization and span export.  |
| `OTEL_SERVICE_NAME`           | `playwright-typescript-framework` | Service name used in trace resources.        |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | `http://127.0.0.1:4318/v1/traces` | OTLP HTTP trace endpoint.                    |
| `OTEL_TRACE_CONSOLE`          | `false`                           | Also writes spans to stdout when true.       |
| `OTEL_RESOURCE_ATTRIBUTES`    | empty                             | Extra resource attributes as `key=value,...` |

## Span Model

- A test root span is created by an auto Playwright fixture.
- `observedStep(name, callback)` records a Playwright `test.step()` and a child span.
- `BaseApiClient` records method, path, and status for API calls.
- `CleanupRegistry` records cleanup resource type and ID for teardown actions.

Each test attaches `otel-trace-context.txt` to Playwright results with the active trace and span identifiers.
