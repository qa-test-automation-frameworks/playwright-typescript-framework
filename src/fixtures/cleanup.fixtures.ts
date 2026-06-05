import { pageFixtures } from './page.fixtures';
import { CleanupRegistry } from '../utils/cleanup-registry';

export type CleanupFixtures = {
  cleanup: CleanupRegistry;
};

export const cleanupFixtures = pageFixtures.extend<CleanupFixtures>({
  cleanup: async ({}, use) => {
    const cleanup = new CleanupRegistry();
    await use(cleanup);
    await cleanup.cleanupAll();
    cleanup.assertClean();
  },
});
