const { spawnSync } = require('node:child_process');

// These browser-free tests use fake request contexts. Never inherit live target
// identities or credentials simply to satisfy the application config schema.
const result = spawnSync(
  process.execPath,
  [
    require.resolve('@playwright/test/cli'),
    'test',
    '--config=playwright.unit.config.ts',
    ...process.argv.slice(2),
  ],
  {
    stdio: 'inherit',
    env: {
      ...process.env,
      BASE_URL: 'http://127.0.0.1:1',
      API_URL: 'http://127.0.0.1:1/api',
      TEST_USER_EMAIL: 'framework.unit@example.test',
      TEST_USER_PASSWORD: 'synthetic-unit-password',
      TEST_USER_USERNAME: 'framework-unit',
      OTEL_ENABLED: 'false',
    },
  },
);
if (result.error) throw result.error;
process.exit(result.status ?? 1);
