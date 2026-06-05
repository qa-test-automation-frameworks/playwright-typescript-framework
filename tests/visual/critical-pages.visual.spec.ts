import { test, expect } from '@src/fixtures';
import { ArticleBuilder } from '@src/builders/ArticleBuilder';
import { appRoutes } from '@src/routes/app-routes';
import { testIds } from '@src/pages/test-ids';

test.describe('Visual: Critical Pages Screenshot Comparison', { tag: ['@visual'] }, () => {
  test.describe('Unauthenticated Pages', () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test('Home feed matches baseline @visual', async ({ page, feedPage }) => {
      // Act
      await feedPage.navigate();
      await feedPage.waitForPageLoad();

      // Assert: Take full page screenshot, masking highly dynamic element sidebar
      await expect(page).toHaveScreenshot('home-feed-guest.png', {
        mask: [page.getByTestId(testIds.sidebarTagList)],
      });
    });

    test('Login page matches baseline @visual', async ({ page, authPage }) => {
      // Act
      await authPage.navigateToLogin();
      await authPage.waitForPageLoad();

      // Assert
      await expect(page).toHaveScreenshot('login-page.png');
    });
  });

  test.describe('Authenticated Pages', () => {
    test('Article page matches baseline @visual', async ({
      page,
      articleApi,
      articlePage,
      cleanup,
    }) => {
      // Arrange: Create article via API
      const articleData = new ArticleBuilder()
        .withTitle('Visual Test Baseline Article')
        .withBody('This is a baseline comparison body content.')
        .build();
      const created = await articleApi.createArticle(articleData);
      cleanup.registerResource('article', created.article.slug, () =>
        articleApi.deleteArticle(created.article.slug),
      );

      // Act
      await page.goto(appRoutes.article(created.article.slug));
      await articlePage.waitForPageLoad();

      // Assert
      await expect(page).toHaveScreenshot('article-details-page.png', {
        mask: [page.getByTestId(testIds.articleDate)],
      });
    });
  });
});
