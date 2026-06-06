import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { test, expect } from '@src/fixtures';
import { ArticleBuilder } from '@src/builders/ArticleBuilder';
import { appRoutes } from '@src/routes/app-routes';
import { installUserToken } from '@src/utils/auth-state';

async function expectNoAccessibilityViolations(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page }).analyze();
  const formattedViolations = results.violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    help: violation.help,
    helpUrl: violation.helpUrl,
    nodes: violation.nodes.map((node) => ({
      target: node.target,
      summary: node.failureSummary,
    })),
  }));
  expect
    .soft(
      formattedViolations,
      `Expected no accessibility violations on ${page.url()}, but found:\n${JSON.stringify(
        formattedViolations,
        null,
        2,
      )}`,
    )
    .toEqual([]);
}

test.describe('Accessibility: Critical Pages', { tag: ['@accessibility'] }, () => {
  test.describe('Unauthenticated pages', () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test('Home feed has no detectable WCAG violations @accessibility', async ({
      page,
      feedPage,
    }) => {
      await feedPage.navigate();

      await expectNoAccessibilityViolations(page);
    });

    test('Login page has no detectable WCAG violations @accessibility', async ({
      page,
      authPage,
    }) => {
      await authPage.navigateToLogin();

      await expectNoAccessibilityViolations(page);
    });
  });

  test.describe('Authenticated pages', () => {
    test('Article editor has no detectable WCAG violations @accessibility', async ({
      page,
      articleEditorPage,
    }) => {
      await articleEditorPage.navigate();

      await expectNoAccessibilityViolations(page);
    });

    test('Article details page has no detectable WCAG violations @accessibility', async ({
      page,
      articleApi,
      articlePage,
      cleanup,
    }) => {
      const article = new ArticleBuilder().build();
      const created = await articleApi.createArticle(article);
      cleanup.registerResource('article', created.article.slug, () =>
        articleApi.deleteArticle(created.article.slug),
      );

      await page.goto(appRoutes.article(created.article.slug));
      await articlePage.waitForPageLoad();

      await expectNoAccessibilityViolations(page);
    });

    test('Profile page has no detectable WCAG violations @accessibility', async ({
      page,
      publishedArticle,
      profilePage,
    }) => {
      await page.goto(appRoutes.profile(publishedArticle.author.username));
      await profilePage.waitForPageLoad();
      await profilePage.showMyArticles();

      await expectNoAccessibilityViolations(page);
    });

    test('Followed author feed has no detectable WCAG violations @accessibility', async ({
      page,
      followerPair,
      feedPage,
    }) => {
      await installUserToken(page.context(), followerPair.follower.token, followerPair.follower);
      await page.goto('/');
      await feedPage.switchToPersonalFeed();

      await expectNoAccessibilityViolations(page);
    });
  });
});
