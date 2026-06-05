import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { test, expect } from '@src/fixtures';
import { ArticleBuilder } from '@src/builders/ArticleBuilder';
import { appRoutes } from '@src/routes/app-routes';

async function expectNoAccessibilityViolations(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
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
  });
});
