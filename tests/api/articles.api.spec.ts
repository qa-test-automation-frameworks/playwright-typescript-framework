import { test, expect } from '@src/fixtures';
import { ArticleBuilder } from '@src/builders/ArticleBuilder';
import { CommentBuilder } from '@src/builders/CommentBuilder';
import { MalformedPayloadBuilder } from '@src/builders/MalformedPayloadBuilder';
import { PaginationQueryBuilder } from '@src/builders/PaginationQueryBuilder';
import { UserBuilder } from '@src/builders/UserBuilder';
import { BaseApiClient } from '@src/api/BaseApiClient';
import { AuthApiClient } from '@src/api/clients/AuthApiClient';
import { ArticleApiClient } from '@src/api/clients/ArticleApiClient';
import { expectApiError } from '@src/utils/api-assertions';

test.describe('API: Articles & Comments', { tag: ['@api'] }, () => {
  test(
    'Create article returns correct shape @smoke @api',
    { tag: ['@smoke', '@api'] },
    async ({ articleApi, cleanup }) => {
      // Arrange
      const articleData = new ArticleBuilder().build();

      // Act
      const response = await articleApi.createArticle(articleData);
      cleanup.registerResource('article', response.article.slug, () =>
        articleApi.deleteArticle(response.article.slug),
      );

      // Assert
      expect.soft(response).toBeValidArticle();
      expect.soft(response.article.title).toBe(articleData.article.title);
      expect.soft(response.article.author.username).toBeTruthy();
    },
  );

  test('Get article by slug @api', async ({ articleApi, cleanup }) => {
    // Arrange
    const articleData = new ArticleBuilder().build();
    const created = await articleApi.createArticle(articleData);
    cleanup.registerResource('article', created.article.slug, () =>
      articleApi.deleteArticle(created.article.slug),
    );

    // Act
    const fetched = await articleApi.getArticle(created.article.slug);

    // Assert
    expect.soft(fetched).toBeValidArticle();
    expect.soft(fetched.article.slug).toBe(created.article.slug);
    expect.soft(fetched.article.body).toBe(articleData.article.body);
  });

  test('Update article title and body @api', async ({ articleApi, cleanup }) => {
    // Arrange
    const articleData = new ArticleBuilder().build();
    const created = await articleApi.createArticle(articleData);
    cleanup.registerResource('article', created.article.slug, () =>
      articleApi.deleteArticle(created.article.slug),
    );

    const updateData = new ArticleBuilder()
      .withTitle('Updated Title Name')
      .withBody('Updated body text value.')
      .buildUpdate();

    // Act
    const updated = await articleApi.updateArticle(created.article.slug, updateData);

    // Assert
    expect.soft(updated).toBeValidArticle();
    expect.soft(updated.article.title).toBe(updateData.article.title);
    expect.soft(updated.article.body).toBe(updateData.article.body);

    const createdTime = new Date(created.article.createdAt).getTime();
    const updatedTime = new Date(updated.article.updatedAt).getTime();
    expect(updatedTime).toBeGreaterThanOrEqual(createdTime);
  });

  test(
    'Delete article removes it @api @critical',
    { tag: ['@critical'] },
    async ({ articleApi }) => {
      // Arrange
      const articleData = new ArticleBuilder().build();
      const created = await articleApi.createArticle(articleData);

      // Act
      await articleApi.deleteArticle(created.article.slug);

      // Assert
      await expectApiError(articleApi.getArticle(created.article.slug), 404);
    },
  );

  test('Favourite article increments count @api', async ({ articleApi, cleanup }) => {
    // Arrange
    const articleData = new ArticleBuilder().build();
    const created = await articleApi.createArticle(articleData);
    cleanup.registerResource('article', created.article.slug, () =>
      articleApi.deleteArticle(created.article.slug),
    );

    // Act
    const favorited = await articleApi.favoriteArticle(created.article.slug);

    // Assert
    expect(favorited.article.favorited).toBe(true);
    expect(favorited.article.favoritesCount).toBe(1);
  });

  test('List articles with tag filter @api', async ({ articleApi, cleanup }) => {
    // Arrange
    const uniqueTag = `tag-${Date.now()}`;
    const articleData = new ArticleBuilder().withTags([uniqueTag]).build();
    const created = await articleApi.createArticle(articleData);
    cleanup.registerResource('article', created.article.slug, () =>
      articleApi.deleteArticle(created.article.slug),
    );

    // Act
    const pagination = new PaginationQueryBuilder().withLimit(20).withOffset(0).build();

    // Act
    const list = await articleApi.listArticles({ tag: uniqueTag, ...pagination });

    // Assert
    expect(list.articlesCount).toBeGreaterThanOrEqual(1);
    expect(list.articles.map((article) => article.title)).toContain(created.article.title);
  });

  test('Add and retrieve comment on article @api', async ({ articleApi, commentApi, cleanup }) => {
    // Arrange
    const articleData = new ArticleBuilder().build();
    const created = await articleApi.createArticle(articleData);
    cleanup.registerResource('article', created.article.slug, () =>
      articleApi.deleteArticle(created.article.slug),
    );

    const commentData = new CommentBuilder()
      .withBody('This is an outstanding automated API comment.')
      .build();

    // Act
    const commentRes = await commentApi.addComment(created.article.slug, commentData);
    const commentsList = await commentApi.getComments(created.article.slug);

    // Assert
    expect(commentRes.comment.body).toBe(commentData.comment.body);
    expect(commentRes.comment.author.username).toBeTruthy();
    expect(commentsList.comments.some((c) => c.id === commentRes.comment.id)).toBe(true);
  });

  test("Authenticated user cannot delete another user's article @api", async ({
    request,
    articleApi,
    cleanup,
  }) => {
    // Arrange
    const articleData = new ArticleBuilder().build();
    const created = await articleApi.createArticle(articleData);
    cleanup.registerResource('article', created.article.slug, () =>
      articleApi.deleteArticle(created.article.slug),
    );

    // Register ephemeral User B via API to attempt unauthorized deletion
    const userBData = new UserBuilder().build();
    const baseClientB = new BaseApiClient(request);
    const authApiB = new AuthApiClient(baseClientB);
    await authApiB.register(userBData);

    const articleApiB = new ArticleApiClient(baseClientB);

    await expectApiError(articleApiB.deleteArticle(created.article.slug), 404);
  });

  test('Malformed article payload returns validation error @api', async ({
    authenticatedApiClient,
  }) => {
    const malformedArticle = JSON.stringify(new MalformedPayloadBuilder().emptyArticle());
    const response = await authenticatedApiClient.rawPost('/articles', malformedArticle, {
      'content-type': 'application/json',
    });

    expect(response.status()).toBe(422);
  });
});
