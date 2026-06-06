import { test, expect } from '@src/fixtures';
import { BaseApiClient } from '@src/api/BaseApiClient';
import { ArticleApiClient } from '@src/api/clients/ArticleApiClient';
import { AuthApiClient } from '@src/api/clients/AuthApiClient';
import { ProfileApiClient } from '@src/api/clients/ProfileApiClient';
import { ArticleBuilder } from '@src/builders/ArticleBuilder';
import { UserBuilder } from '@src/builders/UserBuilder';

test.describe('API: controlled target regressions', { tag: ['@api'] }, () => {
  test('rejects invalid article payloads with 422', async ({ articleApi }) => {
    await expect(
      articleApi.createArticle({ article: { title: '', description: '', body: '' } }),
    ).rejects.toMatchObject({ status: 422 });
  });

  test('rejects empty comments with 422', async ({ publishedArticle, commentApi }) => {
    await expect(
      commentApi.addComment(publishedArticle.slug, { comment: { body: '' } }),
    ).rejects.toMatchObject({ status: 422 });
  });

  test('rejects profile update conflicts with 422', async ({ request, registeredUser }) => {
    const secondPayload = new UserBuilder().build();
    const authApi = new AuthApiClient(new BaseApiClient(request));
    const second = await authApi.register(secondPayload);

    const firstAuth = new AuthApiClient(new BaseApiClient(request, registeredUser.token));
    await expect(
      firstAuth.updateUser({ user: { username: second.user.username } }),
    ).rejects.toMatchObject({ status: 422 });
  });

  test('hides unauthorized article mutations behind 404', async ({ request, publishedArticle }) => {
    const otherUserPayload = new UserBuilder().build();
    const authApi = new AuthApiClient(new BaseApiClient(request));
    const other = await authApi.register(otherUserPayload);
    const otherArticleApi = new ArticleApiClient(new BaseApiClient(request, other.user.token));

    await expect(
      otherArticleApi.updateArticle(publishedArticle.slug, {
        article: { title: 'Unauthorized update' },
      }),
    ).rejects.toMatchObject({ status: 404 });
  });

  test('filters articles by tag', async ({ articleApi, publishedArticle }) => {
    const tag = publishedArticle.tagList[0];
    if (!tag) throw new Error('Published article fixture did not create a tag');
    const articles = await articleApi.listArticles({ tag });

    expect(articles.articlesCount).toBeGreaterThan(0);
    expect(articles.articles.every((article) => article.tagList.includes(tag))).toBe(true);
  });

  test('paginates global feed while preserving total count', async ({ articleApi, cleanup }) => {
    const first = await articleApi.createArticle(
      new ArticleBuilder().withTitle('Page One').build(),
    );
    const second = await articleApi.createArticle(
      new ArticleBuilder().withTitle('Page Two').build(),
    );
    cleanup.registerResource('article', first.article.slug, () =>
      articleApi.deleteArticle(first.article.slug),
    );
    cleanup.registerResource('article', second.article.slug, () =>
      articleApi.deleteArticle(second.article.slug),
    );

    const page = await articleApi.listArticles({ limit: 1, offset: 1 });

    expect(page.articles).toHaveLength(1);
    expect(page.articlesCount).toBeGreaterThanOrEqual(2);
    expect(page.articles[0]?.slug).toBeTruthy();
  });

  test('returns followed authors in the social feed only', async ({ request, followerPair }) => {
    const followerArticleApi = new ArticleApiClient(
      new BaseApiClient(request, followerPair.follower.token),
    );
    const feed = await followerArticleApi.listFeed();

    expect(feed.articles.map((article) => article.slug)).toContain(followerPair.article.slug);

    const profileApi = new ProfileApiClient(
      new BaseApiClient(request, followerPair.follower.token),
    );
    await profileApi.unfollowUser(followerPair.author.username);
    const afterUnfollow = await followerArticleApi.listFeed();

    expect(afterUnfollow.articles.map((article) => article.slug)).not.toContain(
      followerPair.article.slug,
    );
  });

  test('returns 400 for malformed JSON bodies', async ({ authenticatedApiClient }) => {
    const response = await authenticatedApiClient.rawPost('/articles', Buffer.from('{"article":'), {
      'content-type': 'application/json',
    });

    expect(response.status()).toBe(400);
  });
});
