import { test as teardown } from '@playwright/test';
import { BaseApiClient } from '../../src/api/BaseApiClient';
import { ArticleApiClient } from '../../src/api/clients/ArticleApiClient';
import { AuthApiClient } from '../../src/api/clients/AuthApiClient';
import { config } from '../../src/utils/config';
import { readSeedState } from '../../src/utils/auth-state';

teardown('global teardown - remove shared seed', async ({ request }) => {
  const seed = readSeedState();
  if (!seed) return;
  const baseClient = new BaseApiClient(request);
  const authClient = new AuthApiClient(baseClient);
  const articleClient = new ArticleApiClient(baseClient);
  await authClient.login({
    user: { email: config.TEST_USER_EMAIL, password: config.TEST_USER_PASSWORD },
  });
  await articleClient.deleteArticle(seed.slug).catch(() => undefined);
});
