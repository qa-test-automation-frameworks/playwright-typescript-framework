import { pageFixtures } from './page.fixtures';
import { CleanupAggregateError, CleanupRegistry } from '../utils/cleanup-registry';

export type CleanupFixtures = {
  cleanup: CleanupRegistry;
};

export const cleanupFixtures = pageFixtures.extend<CleanupFixtures>({
  cleanup: async ({}, use, testInfo) => {
    const cleanup = new CleanupRegistry();
    await use(cleanup);
    await cleanup.cleanupAll();
    try {
      cleanup.assertClean();
    } catch (error) {
      if (error instanceof CleanupAggregateError) {
        await testInfo.attach('cleanup-failure.json', {
          body: JSON.stringify(error.toDiagnosticRecord()),
          contentType: 'application/json',
        });
      }
      throw error;
    }
  },
});
