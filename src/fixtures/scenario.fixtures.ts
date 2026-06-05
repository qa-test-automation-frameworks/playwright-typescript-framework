import { BaseApiClient } from '../api/BaseApiClient';
import { ArticleApiClient } from '../api/clients/ArticleApiClient';
import { AuthApiClient } from '../api/clients/AuthApiClient';
import { ProfileApiClient } from '../api/clients/ProfileApiClient';
import { ArticleBuilder } from '../builders/ArticleBuilder';
import { UserBuilder } from '../builders/UserBuilder';
import { observabilityFixtures } from './observability.fixtures';

export type RegisteredUser = {
  email: string;
  password: string;
  username: string;
  token: string;
};

export type PublishedArticle = {
  slug: string;
  title: string;
  description: string;
  body: string;
  tagList: string[];
  author: RegisteredUser;
};

export type ScenarioFixtures = {
  registeredUser: RegisteredUser;
  publishedArticle: PublishedArticle;
  articleOwner: RegisteredUser;
  followerPair: { follower: RegisteredUser; author: RegisteredUser; article: PublishedArticle };
};

export const scenarioFixtures = observabilityFixtures.extend<ScenarioFixtures>({
  registeredUser: async ({ request }, use) => {
    const userPayload = new UserBuilder().build();
    const authApi = new AuthApiClient(new BaseApiClient(request));
    const created = await authApi.register(userPayload);
    await use({
      email: userPayload.user.email,
      password: userPayload.user.password,
      username: created.user.username,
      token: created.user.token,
    });
  },

  articleOwner: async ({ registeredUser }, use) => {
    await use(registeredUser);
  },

  publishedArticle: async ({ request, articleOwner, cleanup }, use) => {
    const articlePayload = new ArticleBuilder().build();
    const articleApi = new ArticleApiClient(new BaseApiClient(request, articleOwner.token));
    const created = await articleApi.createArticle(articlePayload);
    cleanup.registerResource('article', created.article.slug, () =>
      articleApi.deleteArticle(created.article.slug),
    );
    await use({
      slug: created.article.slug,
      title: created.article.title,
      description: created.article.description,
      body: created.article.body,
      tagList: created.article.tagList,
      author: articleOwner,
    });
  },

  followerPair: async ({ request, cleanup }, use) => {
    const authApi = new AuthApiClient(new BaseApiClient(request));
    const followerPayload = new UserBuilder().build();
    const authorPayload = new UserBuilder().build();
    const followerCreated = await authApi.register(followerPayload);
    const authorCreated = await authApi.register(authorPayload);

    const follower = {
      email: followerPayload.user.email,
      password: followerPayload.user.password,
      username: followerCreated.user.username,
      token: followerCreated.user.token,
    };
    const author = {
      email: authorPayload.user.email,
      password: authorPayload.user.password,
      username: authorCreated.user.username,
      token: authorCreated.user.token,
    };

    const articleApi = new ArticleApiClient(new BaseApiClient(request, author.token));
    const articlePayload = new ArticleBuilder().withTitle(`Social Feed ${Date.now()}`).build();
    const created = await articleApi.createArticle(articlePayload);
    cleanup.registerResource('article', created.article.slug, () =>
      articleApi.deleteArticle(created.article.slug),
    );

    const profileApi = new ProfileApiClient(new BaseApiClient(request, follower.token));
    await profileApi.followUser(author.username);
    cleanup.registerResource('follow relationship', author.username, () =>
      profileApi.unfollowUser(author.username),
    );

    await use({
      follower,
      author,
      article: {
        slug: created.article.slug,
        title: created.article.title,
        description: created.article.description,
        body: created.article.body,
        tagList: created.article.tagList,
        author,
      },
    });
  },
});
