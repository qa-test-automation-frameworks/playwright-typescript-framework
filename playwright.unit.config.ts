import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/unit',
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [
    ['list'],
    ['json', { outputFile: 'test-results/framework-unit/results.json' }],
    ['junit', { outputFile: 'test-results/framework-unit/junit.xml' }],
  ],
});
