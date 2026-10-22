import { defineConfig, devices } from '@playwright/test';
import { nativeEvidenceMetadata } from './scripts/evidence/native-metadata';
import { sharedAppBrowserPolicy } from './src/utils/browser-trace-policy';

const baseURL = process.env.SHARED_APP_BASE_URL;
if (!baseURL)
  throw new Error('SHARED_APP_BASE_URL must target the isolated pinned reference application.');
const browserPolicy = sharedAppBrowserPolicy(process.env.SHARED_APP_SYNTHETIC === '1');

export default defineConfig({
  metadata: nativeEvidenceMetadata(),
  testDir: './tests/shared-app',
  // Tests share one disposable backend namespace; keep test cases isolated.
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: browserPolicy.retries,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report/shared-app', open: 'never' }],
    ['allure-playwright', { detail: true, outputFolder: 'allure-results' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['json', { outputFile: 'test-results/results.json' }],
  ],
  outputDir: 'test-results/shared-app/artifacts',
  use: {
    ...devices['Desktop Chrome'],
    baseURL,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: browserPolicy.trace,
    actionTimeout: 10_000,
  },
  timeout: 30_000,
  expect: { timeout: 5_000 },
  projects: [
    {
      name: 'shared-app-ui',
      testMatch: /(?:reference-application|keyboard-focus(?:\.controls)?)\.spec\.ts$/,
    },
  ],
});
