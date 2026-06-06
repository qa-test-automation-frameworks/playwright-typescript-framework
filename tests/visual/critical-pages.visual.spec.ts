import { test, expect } from '@src/fixtures';
import { ArticleBuilder } from '@src/builders/ArticleBuilder';
import { appRoutes } from '@src/routes/app-routes';
import { testIds } from '@src/pages/test-ids';
import { installUserToken } from '@src/utils/auth-state';

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

    test('Profile page matches baseline @visual', async ({
      page,
      articleApi,
      profilePage,
      cleanup,
    }) => {
      const articleData = new ArticleBuilder()
        .withTitle('Visual Test Profile Article')
        .withDescription('Profile visual regression fixture')
        .withBody('This article makes the profile page deterministic for visual coverage.')
        .withTags(['visual-profile'])
        .build();
      const created = await articleApi.createArticle(articleData);
      cleanup.registerResource('article', created.article.slug, () =>
        articleApi.deleteArticle(created.article.slug),
      );

      await page.goto(appRoutes.profile(created.article.author.username));
      await profilePage.waitForPageLoad();
      await profilePage.showMyArticles();

      await expect(page).toHaveScreenshot('profile-page.png', {
        mask: [page.getByTestId(testIds.articleDate)],
      });
    });

    test('Settings page matches baseline @visual', async ({ page, settingsPage }) => {
      await settingsPage.navigate();

      await expect(page).toHaveScreenshot('settings-page.png');
    });

    test('Followed author feed matches baseline @visual', async ({
      page,
      followerPair,
      feedPage,
    }) => {
      await installUserToken(page.context(), followerPair.follower.token, followerPair.follower);
      await page.goto('/');
      await feedPage.switchToPersonalFeed();

      await expect(page).toHaveScreenshot('followed-author-feed.png', {
        mask: [page.getByTestId(testIds.articleDate), page.getByTestId(testIds.sidebarTagList)],
      });
    });
  });
});
