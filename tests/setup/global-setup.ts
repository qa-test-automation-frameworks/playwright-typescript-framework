import { test as setup } from '@playwright/test';
import { BaseApiClient } from '../../src/api/BaseApiClient';
import { AuthApiClient } from '../../src/api/clients/AuthApiClient';
import { ArticleApiClient } from '../../src/api/clients/ArticleApiClient';
import { ArticleBuilder } from '../../src/builders/ArticleBuilder';
import { Logger } from '../../src/utils/logger';
import { config } from '../../src/utils/config';
import { assertEnvironmentReady } from '../../src/utils/environment';
import {
  ensureAuthDirectory,
  writeSeedState,
  writeUserStorageState,
} from '../../src/utils/auth-state';

setup('global setup - authenticate and seed', async ({ request }) => {
  Logger.info('Starting global setup...');
  ensureAuthDirectory();
  const baseClient = new BaseApiClient(request);
  const authClient = new AuthApiClient(baseClient);
  const articleClient = new ArticleApiClient(baseClient);
  const readiness = await assertEnvironmentReady(request);
  Logger.info('Environment readiness check passed', readiness);
  const loginResponse = await authClient.login({
    user: { email: config.TEST_USER_EMAIL, password: config.TEST_USER_PASSWORD },
  });
  baseClient.setToken(loginResponse.user.token);
  writeUserStorageState(new URL(config.BASE_URL).origin, loginResponse.user);
  const seedArticleData = new ArticleBuilder()
    .withTitle(`Shared Global Seed Article ${process.env.TEST_RUN_ID || Date.now()}`)
    .withBody('This is a global seed article created during setup and deleted during teardown.')
    .withTags(['seed', 'global'])
    .build();
  const articleResponse = await articleClient.createArticle(seedArticleData);
  writeSeedState({
    slug: articleResponse.article.slug,
    username: loginResponse.user.username,
    createdAt: new Date().toISOString(),
  });
});
