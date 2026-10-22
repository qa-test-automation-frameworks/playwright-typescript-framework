import { defineConfig, devices } from '@playwright/test';

const output = process.env.BROWSER_TRACE_CONTROL_OUT ?? 'work/audit-2026-10-21/B2/trace-control';

export default defineConfig({
  testDir: './tests/trace-control',
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [['list'], ['json', { outputFile: `${output}/results.json` }]],
  outputDir: `${output}/artifacts`,
  use: {
    ...devices['Desktop Chrome'],
    headless: true,
    viewport: { width: 800, height: 600 },
    screenshot: 'off',
    video: 'off',
    trace: 'retain-on-failure',
  },
  timeout: 10_000,
  expect: { timeout: 1_000 },
});
