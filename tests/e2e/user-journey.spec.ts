import { test, expect } from '@src/fixtures';
import { Page } from '@playwright/test';
import { UserBuilder } from '@src/builders/UserBuilder';
import { ArticleBuilder } from '@src/builders/ArticleBuilder';
import { CommentBuilder } from '@src/builders/CommentBuilder';
import { ArticleApiClient } from '@src/api/clients/ArticleApiClient';
import { AuthApiClient } from '@src/api/clients/AuthApiClient';
import { BaseApiClient } from '@src/api/BaseApiClient';
import { observedStep } from '@src/observability/observed-step';
import { appRoutes } from '@src/routes/app-routes';
import { installUserToken } from '@src/utils/auth-state';

async function publishArticleThroughUi(
  page: Page,
  articleEditorPage: {
    fillTitle(title: string): Promise<void>;
    fillDescription(description: string): Promise<void>;
    fillBody(body: string): Promise<void>;
    addTag(tag: string): Promise<void>;
    submit(): Promise<void>;
  },
  article: ReturnType<ArticleBuilder['build']>,
): Promise<void> {
  await articleEditorPage.fillTitle(article.article.title);
  await articleEditorPage.fillDescription(article.article.description);
  await articleEditorPage.fillBody(article.article.body);
  for (const tag of article.article.tagList || []) {
    await articleEditorPage.addTag(tag);
  }

  const publishResponse = page.waitForResponse(
    (response) =>
      /\/articles$/.test(new URL(response.url()).pathname) &&
      response.request().method() === 'POST' &&
      response.status() >= 200 &&
      response.status() < 300,
  );
  await articleEditorPage.submit();
  await publishResponse;
}

test.describe('E2E: Focused User Journeys', { tag: ['@ui'] }, () => {
  test.describe('Registration and publishing', () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test(
      'registration creates an authenticated session @smoke @ui @critical',
      { tag: ['@smoke', '@ui', '@critical'] },
      async ({ authPage }) => {
        const userPayload = new UserBuilder().build();

        await authPage.navigateToRegister();
        await authPage.registerUserAndWaitForSession(userPayload);

        await expect(authPage.header.profileLink).toBeVisible({ timeout: 10_000 });
        await expect(authPage.header.profileLink).toContainText(userPayload.user.username);
      },
    );

    test('registered author publishes a tagged article @ui @critical', async ({
      request,
      authPage,
      page,
      articleEditorPage,
      articlePage,
      cleanup,
    }) => {
      const userPayload = new UserBuilder().build();
      const articlePayload = new ArticleBuilder().build();

      await authPage.navigateToRegister();
      await authPage.registerUserAndWaitForSession(userPayload);
      await expect(authPage.header.profileLink).toBeVisible({ timeout: 10_000 });

      await authPage.header.navigateToNewArticle();
      await publishArticleThroughUi(page, articleEditorPage, articlePayload);

      await expect(articlePage.titleHeading).toBeVisible({ timeout: 10_000 });
      await expect(articlePage.titleHeading).toHaveText(articlePayload.article.title);

      const slug = articlePage.getUrl().split('/').pop() || '';
      if (slug) {
        const client = new BaseApiClient(request);
        const login = await new AuthApiClient(client).login({
          user: {
            email: userPayload.user.email,
            password: userPayload.user.password,
          },
        });
        cleanup.registerResource('article', slug, () =>
          new ArticleApiClient(new BaseApiClient(request, login.user.token)).deleteArticle(slug),
        );
      }
    });
  });

  test('global feed discovery opens an API-created article @ui', async ({
    page,
    publishedArticle,
    feedPage,
    articlePage,
  }) => {
    await observedStep('Open the global feed and select the seeded article', async () => {
      await feedPage.navigate();
      await feedPage.switchToGlobalFeed();
      await expect(feedPage.articleCard(publishedArticle.title)).toBeVisible();
      await feedPage.clickArticle(publishedArticle.title);
      await page.waitForURL(appRoutes.article(publishedArticle.slug));
    });

    await expect(articlePage.titleHeading).toHaveText(publishedArticle.title);
  });

  test('commenting adds the comment to the article page @ui', async ({
    page,
    publishedArticle,
    articlePage,
  }) => {
    const comment = new CommentBuilder().build();

    await page.goto(appRoutes.article(publishedArticle.slug));
    await articlePage.waitForPageLoad();
    await articlePage.postComment(comment.comment.body);

    await expect(articlePage.commentTexts.filter({ hasText: comment.comment.body })).toBeVisible();
  });

  test('profile visibility shows authored article @ui', async ({
    page,
    publishedArticle,
    profilePage,
  }) => {
    await page.goto(appRoutes.profile(publishedArticle.author.username));
    await profilePage.waitForPageLoad();
    await profilePage.showMyArticles();

    await expect(profilePage.usernameHeading).toContainText(publishedArticle.author.username);
    await expect(
      profilePage.articleTitles.filter({ hasText: publishedArticle.title }),
    ).toBeVisible();
  });

  test('followed author article appears in personal feed @ui @critical', async ({
    page,
    followerPair,
    feedPage,
  }) => {
    await installUserToken(page.context(), followerPair.follower.token, followerPair.follower);
    await page.goto('/');

    await feedPage.switchToPersonalFeed();

    await expect(feedPage.articleCard(followerPair.article.title)).toBeVisible();
  });

  test('unfollowed author article is removed from personal feed @ui', async ({
    page,
    followerPair,
    profilePage,
    feedPage,
  }) => {
    await installUserToken(page.context(), followerPair.follower.token, followerPair.follower);
    await page.goto('/');

    await profilePage.navigateToUser(followerPair.author.username);
    await profilePage.unfollowUser();
    await feedPage.navigate();
    await feedPage.switchToPersonalFeed();

    await expect(feedPage.articleCard(followerPair.article.title)).toHaveCount(0);
  });
});
