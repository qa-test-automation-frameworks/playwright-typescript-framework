import { test, expect } from '@src/fixtures';
import { appRoutes } from '@src/routes/app-routes';
import { testIds } from '@src/pages/test-ids';

test.describe('Contract: controlled UI selectors', { tag: ['@contract'] }, () => {
  test('feed exposes article-card selector surfaces @contract', async ({
    page,
    publishedArticle,
  }) => {
    await page.goto('/');

    const articleCard = page
      .getByTestId(testIds.articleCard)
      .filter({ hasText: publishedArticle.title });

    await expect.soft(articleCard).toBeVisible();
    await expect.soft(articleCard.getByTestId(testIds.articleAuthor)).toBeVisible();
    await expect
      .soft(articleCard.getByTestId(testIds.articleTitle))
      .toHaveText(publishedArticle.title);
    await expect.soft(articleCard.getByTestId(testIds.articleDescription)).toBeVisible();
    await expect.soft(articleCard.getByTestId(testIds.articleDate)).toBeVisible();
    await expect
      .soft(articleCard.getByTestId(testIds.articleTag))
      .toHaveCount(publishedArticle.tagList.length);
  });

  test('article details expose article and comment selector surfaces @contract', async ({
    page,
    publishedArticle,
    commentApi,
  }) => {
    const commentBody = `selector contract comment ${Date.now()}`;
    await commentApi.addComment(publishedArticle.slug, {
      comment: { body: commentBody },
    });

    await page.goto(appRoutes.article(publishedArticle.slug));

    await expect.soft(page.getByTestId(testIds.articleTitle)).toHaveText(publishedArticle.title);
    await expect.soft(page.getByTestId(testIds.articleMeta)).toBeVisible();
    await expect.soft(page.getByTestId(testIds.articleAuthor)).toBeVisible();
    await expect.soft(page.getByTestId(testIds.articleBody)).toBeVisible();
    await expect.soft(page.getByTestId(testIds.articleDescription)).toBeVisible();
    await expect.soft(page.getByTestId(testIds.articleDate)).toBeVisible();
    await expect
      .soft(page.getByTestId(testIds.articleTag))
      .toHaveCount(publishedArticle.tagList.length);

    const commentCard = page.getByTestId(testIds.commentCard).filter({ hasText: commentBody });
    await expect.soft(commentCard).toBeVisible();
    await expect.soft(commentCard.getByTestId(testIds.commentText)).toHaveText(commentBody);
  });

  test('profile and authenticated navigation expose selector surfaces @contract', async ({
    page,
    publishedArticle,
  }) => {
    await page.goto(appRoutes.profile(publishedArticle.author.username));

    await expect
      .soft(page.getByTestId(testIds.profileHeading))
      .toHaveText(publishedArticle.author.username);
    await expect.soft(page.getByTestId(testIds.profileBio)).toBeAttached();
    await expect.soft(page.getByTestId(testIds.articleCard).first()).toBeVisible();
    await expect.soft(page.getByTestId(testIds.profileLink)).toBeVisible();
  });

  test('validation errors expose error selector surfaces @contract', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect.soft(page.getByTestId(testIds.errors)).toBeVisible();
    await expect.soft(page.getByTestId(testIds.errorItem)).toBeVisible();
  });
});
