import {
  context,
  INVALID_SPAN_CONTEXT,
  Span,
  SpanStatusCode,
  trace,
  Tracer,
} from '@opentelemetry/api';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { BatchSpanProcessor, ConsoleSpanExporter } from '@opentelemetry/sdk-trace-base';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';

let provider: NodeTracerProvider | undefined;

export type SpanAttributes = Record<string, string | number | boolean | undefined>;

export const isTelemetryEnabled = (): boolean => process.env.OTEL_ENABLED === 'true';

export const initTelemetry = (): void => {
  if (!isTelemetryEnabled() || provider) return;

  provider = new NodeTracerProvider({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME || 'playwright-typescript-framework',
      ...parseResourceAttributes(process.env.OTEL_RESOURCE_ATTRIBUTES),
    }),
    spanProcessors: [
      new BatchSpanProcessor(
        new OTLPTraceExporter({
          url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://127.0.0.1:4318/v1/traces',
        }),
      ),
      ...(process.env.OTEL_TRACE_CONSOLE === 'true'
        ? [new BatchSpanProcessor(new ConsoleSpanExporter())]
        : []),
    ],
  });

  provider.register();
};

export const getTracer = (): Tracer => {
  initTelemetry();
  return trace.getTracer(process.env.OTEL_SERVICE_NAME || 'playwright-typescript-framework');
};

export const withSpan = async <T>(
  name: string,
  attributes: SpanAttributes,
  callback: (span: Span) => Promise<T>,
): Promise<T> => {
  if (!isTelemetryEnabled()) {
    return callback(trace.getActiveSpan() ?? trace.wrapSpanContext(INVALID_SPAN_CONTEXT));
  }

  const tracer = getTracer();
  return tracer.startActiveSpan(name, sanitizeAttributes(attributes), async (span) => {
    try {
      const result = await callback(span);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.recordException(error instanceof Error ? error : new Error(String(error)));
      span.setStatus({ code: SpanStatusCode.ERROR });
      throw error;
    } finally {
      span.end();
    }
  });
};

export const flushTelemetry = async (): Promise<void> => {
  if (provider) await provider.forceFlush();
};

export const activeTraceContext = (): { traceId?: string; spanId?: string } => {
  const active = trace.getSpan(context.active());
  return active?.spanContext() || {};
};

export const sanitizeAttributes = (
  attributes: SpanAttributes,
): Record<string, string | number | boolean> =>
  Object.fromEntries(
    Object.entries(attributes).filter(([, value]) =>
      ['string', 'number', 'boolean'].includes(typeof value),
    ),
  ) as Record<string, string | number | boolean>;

const parseResourceAttributes = (value?: string): Record<string, string> => {
  if (!value) return {};
  return Object.fromEntries(
    value
      .split(',')
      .map((pair): [string, string] | null => {
        const [key, attributeValue] = pair.split('=');
        return key && attributeValue ? [key.trim(), attributeValue.trim()] : null;
      })
      .filter((pair): pair is [string, string] => pair !== null),
  );
};
