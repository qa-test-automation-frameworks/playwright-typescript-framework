import { cleanupFixtures } from './cleanup.fixtures';
import {
  activeTraceContext,
  flushTelemetry,
  initTelemetry,
  withSpan,
} from '../observability/telemetry';

type ObservabilityFixtures = {
  otelTestSpan: void;
};

export const observabilityFixtures = cleanupFixtures.extend<ObservabilityFixtures>({
  otelTestSpan: [
    async ({}, use, testInfo): Promise<void> => {
      initTelemetry();
      await withSpan(
        `test:${testInfo.title}`,
        {
          'test.title': testInfo.title,
          'test.file': testInfo.file,
          'test.project': testInfo.project.name,
          'test.retry': testInfo.retry,
          'test.shard': process.env.PLAYWRIGHT_SHARD || '',
        },
        async () => {
          await use();
          const traceContext = activeTraceContext();
          await testInfo.attach('otel-trace-context.txt', {
            body: `traceId=${traceContext.traceId || ''}\nspanId=${traceContext.spanId || ''}\n`,
            contentType: 'text/plain',
          });
        },
      );
      await flushTelemetry();
    },
    { auto: true },
  ],
});
