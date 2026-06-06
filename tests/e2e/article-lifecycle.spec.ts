import { test, expect } from '@src/fixtures';
import { ArticleBuilder } from '@src/builders/ArticleBuilder';
import { config } from '@src/utils/config';
import { appRoutes } from '@src/routes/app-routes';

test.describe('E2E: Article Lifecycle', { tag: ['@ui'] }, () => {
  test(
    'Create article via UI and verify published article page @smoke @ui @critical',
    { tag: ['@smoke', '@ui', '@critical'] },
    async ({ authPage, articleEditorPage, articlePage, articleApi, cleanup }) => {
      // Arrange
      const article = new ArticleBuilder().build();
      await authPage.navigateToLogin();
      await authPage.loginUserAndWaitForSession({
        user: {
          email: config.TEST_USER_EMAIL,
          password: config.TEST_USER_PASSWORD,
        },
      });
      await authPage.header.navigateToNewArticle();

      // Act: Create article via UI
      await articleEditorPage.fillTitle(article.article.title);
      await articleEditorPage.fillDescription(article.article.description);
      await articleEditorPage.fillBody(article.article.body);
      for (const tag of article.article.tagList || []) {
        await articleEditorPage.addTag(tag);
      }
      await articleEditorPage.submit();

      // Assert: Redirected to ArticlePage and displays correct information
      await expect(articlePage.titleHeading).toBeVisible({ timeout: 10000 });
      await expect(articlePage.titleHeading).toHaveText(article.article.title);

      // Save slug from URL for API cleanup
      const url = articlePage.getUrl();
      const slug = url.split('/').pop() || '';
      if (slug) {
        cleanup.registerResource('article', slug, () => articleApi.deleteArticle(slug));
      }

      expect(articlePage.getUrl()).toContain(`/article/${slug}`);
    },
  );

  test('Edit article updates content on article page @ui', async ({
    page,
    articleApi,
    articlePage,
    articleEditorPage,
    cleanup,
  }) => {
    // Arrange: Create article via API
    const article = new ArticleBuilder().build();
    const created = await articleApi.createArticle(article);
    cleanup.registerResource('article', created.article.slug, () =>
      articleApi.deleteArticle(created.article.slug),
    );

    // Act: Navigate to article page and edit
    await page.goto(appRoutes.article(created.article.slug));
    await articlePage.waitForPageLoad();
    await articlePage.editArticle();

    const updatedTitle = `Updated UI - ${Date.now()}`;
    await articleEditorPage.fillTitle(updatedTitle);
    await articleEditorPage.update();

    // Assert: Verifies updated content
    await expect(articlePage.titleHeading).toBeVisible({ timeout: 10000 });
    await expect(articlePage.titleHeading).toHaveText(updatedTitle);
  });

  test('Delete article removes it from feed @ui', async ({
    page,
    articleApi,
    articlePage,
    feedPage,
  }) => {
    // Arrange: Create article via API
    const article = new ArticleBuilder().build();
    const created = await articleApi.createArticle(article);

    // Act: Navigate and delete
    await page.goto(appRoutes.article(created.article.slug));
    await articlePage.waitForPageLoad();
    await articlePage.deleteArticle();

    // Assert: Redirected to feed, article absent from global feed
    await expect(page).toHaveURL(/\/#?\/?$/);
    await feedPage.switchToGlobalFeed();
    await expect(feedPage.articleCard(article.article.title)).toHaveCount(0);
  });

  test('Favourite article from feed updates count @ui', async ({
    articleApi,
    feedPage,
    cleanup,
  }) => {
    // Arrange: Create article via API
    const article = new ArticleBuilder().build();
    const created = await articleApi.createArticle(article);
    cleanup.registerResource('article', created.article.slug, () =>
      articleApi.deleteArticle(created.article.slug),
    );

    // Act: Go to global feed and favorite
    await feedPage.navigate();
    await feedPage.switchToGlobalFeed();
    await feedPage.favoriteArticle(article.article.title);

    // Assert: Favorite status or count updates
    await expect(feedPage.favoriteButtonForArticle(article.article.title)).toContainText('1');
  });

  test('User can add a comment and it appears on the page @ui', async ({
    page,
    articleApi,
    articlePage,
    cleanup,
  }) => {
    // Arrange: Create article via API
    const article = new ArticleBuilder().build();
    const created = await articleApi.createArticle(article);
    cleanup.registerResource('article', created.article.slug, () =>
      articleApi.deleteArticle(created.article.slug),
    );

    const commentText = `UI Comment - ${Date.now()}`;

    // Act: Go to article details and post comment
    await page.goto(appRoutes.article(created.article.slug));
    await articlePage.waitForPageLoad();
    await articlePage.postComment(commentText);

    // Assert: Comment displays
    await expect(articlePage.commentTexts.filter({ hasText: commentText })).toBeVisible();
  });
});
