import { test, expect } from '@src/fixtures';
import { ArticleBuilder } from '@src/builders/ArticleBuilder';
import { appRoutes } from '@src/routes/app-routes';
import { observedStep } from '@src/observability/observed-step';

test.describe('E2E: Article Lifecycle', { tag: ['@ui'] }, () => {
  test(
    'Create article via UI and verify published article page @smoke @ui @critical',
    { tag: ['@smoke', '@ui', '@critical'] },
    async ({ articleEditorPage, articlePage, articleApi, cleanup }) => {
      const article = new ArticleBuilder().build();

      await observedStep('Open authenticated article editor', async () => {
        await articleEditorPage.navigate();
      });

      await observedStep('Create article through the editor UI', async () => {
        await articleEditorPage.fillTitle(article.article.title);
        await articleEditorPage.fillDescription(article.article.description);
        await articleEditorPage.fillBody(article.article.body);
        for (const tag of article.article.tagList || []) {
          await articleEditorPage.addTag(tag);
        }
        await articleEditorPage.submit();
      });

      await observedStep('Verify published article and register cleanup', async () => {
        await expect(articlePage.titleHeading).toBeVisible({ timeout: 10_000 });
        await expect(articlePage.titleHeading).toHaveText(article.article.title);
      });

      const slug = articlePage.getUrl().split('/').pop() || '';
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
    const article = new ArticleBuilder().build();
    const created = await observedStep('Create article fixture through API', async () => {
      const response = await articleApi.createArticle(article);
      cleanup.registerResource('article', response.article.slug, () =>
        articleApi.deleteArticle(response.article.slug),
      );
      return response;
    });

    await observedStep('Open article page and enter edit mode', async () => {
      await page.goto(appRoutes.article(created.article.slug));
      await articlePage.waitForPageLoad();
      await articlePage.editArticle();
    });

    const updatedTitle = `Updated UI - ${Date.now()}`;
    await observedStep('Submit updated article title through UI', async () => {
      await articleEditorPage.fillTitle(updatedTitle);
      await articleEditorPage.update();
    });

    await observedStep('Verify updated article title', async () => {
      await expect(articlePage.titleHeading).toBeVisible({ timeout: 10_000 });
      await expect(articlePage.titleHeading).toHaveText(updatedTitle);
    });
  });

  test('Delete article removes it from feed @ui', async ({
    page,
    articleApi,
    articlePage,
    feedPage,
  }) => {
    const article = new ArticleBuilder().build();
    const created = await observedStep('Create article fixture through API', async () =>
      articleApi.createArticle(article),
    );

    await observedStep('Delete article through UI', async () => {
      await page.goto(appRoutes.article(created.article.slug));
      await articlePage.waitForPageLoad();
      await articlePage.deleteArticle();
    });

    await observedStep('Verify deleted article is absent from global feed', async () => {
      await expect(page).toHaveURL(/\/#?\/?$/);
      await feedPage.switchToGlobalFeed();
      await expect(feedPage.articleCard(article.article.title)).toHaveCount(0);
    });
  });

  test('Favourite article from feed updates count @ui', async ({
    articleApi,
    feedPage,
    cleanup,
  }) => {
    const article = new ArticleBuilder().build();
    const created = await observedStep('Create article fixture through API', async () => {
      const response = await articleApi.createArticle(article);
      cleanup.registerResource('article', response.article.slug, () =>
        articleApi.deleteArticle(response.article.slug),
      );
      return response;
    });

    await observedStep('Favorite article from global feed', async () => {
      await feedPage.navigate();
      await feedPage.switchToGlobalFeed();
      await feedPage.favoriteArticle(created.article.title);
    });

    await observedStep('Verify favorite count update', async () => {
      await expect(feedPage.favoriteButtonForArticle(created.article.title)).toContainText('1');
    });
  });

  test('User can add a comment and it appears on the page @ui', async ({
    page,
    articleApi,
    articlePage,
    cleanup,
  }) => {
    const article = new ArticleBuilder().build();
    const created = await observedStep('Create article fixture through API', async () => {
      const response = await articleApi.createArticle(article);
      cleanup.registerResource('article', response.article.slug, () =>
        articleApi.deleteArticle(response.article.slug),
      );
      return response;
    });

    const commentText = `UI Comment - ${Date.now()}`;
    await observedStep('Post comment through article UI', async () => {
      await page.goto(appRoutes.article(created.article.slug));
      await articlePage.waitForPageLoad();
      await articlePage.postComment(commentText);
    });

    await observedStep('Verify new comment is visible', async () => {
      await expect(articlePage.commentTexts.filter({ hasText: commentText })).toBeVisible();
    });
  });
});
