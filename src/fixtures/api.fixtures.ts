import { authFixtures } from './auth.fixtures';
import { BaseApiClient } from '../api/BaseApiClient';
import { AuthApiClient } from '../api/clients/AuthApiClient';
import { ArticleApiClient } from '../api/clients/ArticleApiClient';
import { CommentApiClient } from '../api/clients/CommentApiClient';
import { ProfileApiClient } from '../api/clients/ProfileApiClient';

export type ApiFixtures = {
  anonymousApiClient: BaseApiClient;
  anonymousAuthApi: AuthApiClient;
  createAnonymousAuthApi: () => AuthApiClient;
  authenticatedApiClient: BaseApiClient;
  authenticatedAuthApi: AuthApiClient;
  baseApiClient: BaseApiClient;
  authApi: AuthApiClient;
  articleApi: ArticleApiClient;
  commentApi: CommentApiClient;
  profileApi: ProfileApiClient;
};

export const apiFixtures = authFixtures.extend<ApiFixtures>({
  anonymousApiClient: async ({ request }, use) => {
    await use(new BaseApiClient(request));
  },

  anonymousAuthApi: async ({ anonymousApiClient }, use) => {
    await use(new AuthApiClient(anonymousApiClient));
  },

  createAnonymousAuthApi: async ({ request }, use) => {
    await use(() => new AuthApiClient(new BaseApiClient(request)));
  },

  authenticatedApiClient: async ({ request, userToken }, use) => {
    await use(new BaseApiClient(request, userToken));
  },

  authenticatedAuthApi: async ({ authenticatedApiClient }, use) => {
    await use(new AuthApiClient(authenticatedApiClient));
  },

  baseApiClient: async ({ request, userToken }, use) => {
    const client = new BaseApiClient(request, userToken);
    await use(client);
  },

  authApi: async ({ anonymousAuthApi }, use) => {
    await use(anonymousAuthApi);
  },

  articleApi: async ({ authenticatedApiClient }, use) => {
    await use(new ArticleApiClient(authenticatedApiClient));
  },

  commentApi: async ({ authenticatedApiClient }, use) => {
    await use(new CommentApiClient(authenticatedApiClient));
  },

  profileApi: async ({ authenticatedApiClient }, use) => {
    await use(new ProfileApiClient(authenticatedApiClient));
  },
});
