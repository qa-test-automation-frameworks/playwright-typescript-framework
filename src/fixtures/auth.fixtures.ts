import {
  test as baseTest,
  request as playwrightRequest,
  APIRequestContext,
} from '@playwright/test';
import { BaseApiClient } from '../api/BaseApiClient';
import { AuthApiClient } from '../api/clients/AuthApiClient';
import { config } from '../utils/config';
import { readStoredUserToken } from '../utils/auth-state';

export type AuthFixtures = {
  userToken: string;
  authenticatedRequest: APIRequestContext;
};

export const authFixtures = baseTest.extend<AuthFixtures>({
  userToken: async ({ request }, use) => {
    let token = readStoredUserToken();

    if (!token) {
      const client = new BaseApiClient(request);
      const authApi = new AuthApiClient(client);

      const login = await authApi.login({
        user: {
          email: config.TEST_USER_EMAIL,
          password: config.TEST_USER_PASSWORD,
        },
      });
      token = login.user.token;
    }

    await use(token);
  },

  authenticatedRequest: async ({ userToken }, use) => {
    const context = await playwrightRequest.newContext({
      extraHTTPHeaders: {
        Authorization: userToken ? `Token ${userToken}` : '',
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });
    await use(context);
    await context.dispose();
  },
});
