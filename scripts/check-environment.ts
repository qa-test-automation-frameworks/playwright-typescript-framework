import { request } from '@playwright/test';
import { assertEnvironmentReady } from '../src/utils/environment';
import { Logger } from '../src/utils/logger';

async function main(): Promise<void> {
  const context = await request.newContext();

  try {
    const readiness = await assertEnvironmentReady(context);
    Logger.info('Environment readiness check passed', readiness);
  } finally {
    await context.dispose();
  }
}

main().catch((error: unknown) => {
  Logger.error('Environment readiness check failed', error instanceof Error ? error : undefined, {
    error: error instanceof Error ? error.message : String(error),
  });
  process.exitCode = 1;
});
