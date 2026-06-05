import { authFixtures } from './auth.fixtures';
import { BaseApiClient } from '../api/BaseApiClient';
import { AuthApiClient } from '../api/clients/AuthApiClient';
import { ArticleApiClient } from '../api/clients/ArticleApiClient';
import { CommentApiClient } from '../api/clients/CommentApiClient';
import { ProfileApiClient } from '../api/clients/ProfileApiClient';

export type ApiFixtures = {
  baseApiClient: BaseApiClient;
  authApi: AuthApiClient;
  articleApi: ArticleApiClient;
  commentApi: CommentApiClient;
  profileApi: ProfileApiClient;
};

export const apiFixtures = authFixtures.extend<ApiFixtures>({
  baseApiClient: async ({ request, userToken }, use) => {
    const client = new BaseApiClient(request, userToken);
    await use(client);
  },

  authApi: async ({ baseApiClient }, use) => {
    await use(new AuthApiClient(baseApiClient));
  },

  articleApi: async ({ baseApiClient }, use) => {
    await use(new ArticleApiClient(baseApiClient));
  },

  commentApi: async ({ baseApiClient }, use) => {
    await use(new CommentApiClient(baseApiClient));
  },

  profileApi: async ({ baseApiClient }, use) => {
    await use(new ProfileApiClient(baseApiClient));
  },
});
