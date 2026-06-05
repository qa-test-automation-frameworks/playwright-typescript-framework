import { test, expect } from '@src/fixtures';
import { UserBuilder } from '@src/builders/UserBuilder';
import { ArticleBuilder } from '@src/builders/ArticleBuilder';
import { ProfileUpdateBuilder } from '@src/builders/ProfileUpdateBuilder';
import { BaseApiClient } from '@src/api/BaseApiClient';
import { AuthApiClient } from '@src/api/clients/AuthApiClient';
import { ArticleApiClient } from '@src/api/clients/ArticleApiClient';
import { ProfileApiClient } from '@src/api/clients/ProfileApiClient';

async function expectProfileAvailable(
  profileApi: ProfileApiClient,
  username: string,
): Promise<void> {
  await expect
    .poll(
      async () => {
        try {
          const response = await profileApi.getProfile(username);
          return response.profile.username;
        } catch {
          return null;
        }
      },
      {
        message: `profile ${username} should be readable before social graph actions`,
        timeout: 10_000,
      },
    )
    .toBe(username);
}

test.describe('API: User Profiles & Social Graph', { tag: ['@api'] }, () => {
  test('Get public profile by username @api', async ({ request }) => {
    // Arrange
    const userData = new UserBuilder().build();
    const baseClient = new BaseApiClient(request);
    const authApi = new AuthApiClient(baseClient);
    const registered = await authApi.register(userData);

    // Act
    const profileApi = new ProfileApiClient(baseClient);
    const res = await profileApi.getProfile(registered.user.username);

    // Assert
    expect(res.profile.username).toBe(registered.user.username);
    expect(res.profile.following).toBe(false);
  });

  test('Builds profile update payloads for account settings coverage @api', () => {
    const updatePayload = new ProfileUpdateBuilder().withBio('Senior SDET portfolio user').build();

    expect(updatePayload.user.bio).toBe('Senior SDET portfolio user');
    expect(updatePayload.user.image).toMatch(/^https?:\/\//);
  });

  test('Follow a user @api', async ({ request, cleanup }) => {
    // Arrange: Create User A and User B
    const userAData = new UserBuilder().build();
    const baseClientA = new BaseApiClient(request);
    const authApiA = new AuthApiClient(baseClientA);
    await authApiA.register(userAData);
    const profileApiA = new ProfileApiClient(baseClientA);

    const userBData = new UserBuilder().build();
    const baseClientB = new BaseApiClient(request);
    const authApiB = new AuthApiClient(baseClientB);
    const registerB = await authApiB.register(userBData);
    const userB = { username: registerB.user.username, token: registerB.user.token };
    cleanup.registerResource('follow relationship', userB.username, () =>
      profileApiA.unfollowUser(userB.username),
    );
    await expectProfileAvailable(profileApiA, userB.username);

    // Act
    const followRes = await profileApiA.followUser(userB.username);
    const profileRes = await profileApiA.getProfile(userB.username);

    // Assert
    expect.soft(followRes.profile.following).toBe(true);
    expect.soft(profileRes.profile.following).toBe(true);
  });

  test('Unfollow a user @api', async ({ request, cleanup }) => {
    // Arrange: Create User A and User B, then follow
    const userAData = new UserBuilder().build();
    const baseClientA = new BaseApiClient(request);
    const authApiA = new AuthApiClient(baseClientA);
    await authApiA.register(userAData);
    const profileApiA = new ProfileApiClient(baseClientA);

    const userBData = new UserBuilder().build();
    const baseClientB = new BaseApiClient(request);
    const authApiB = new AuthApiClient(baseClientB);
    const registerB = await authApiB.register(userBData);
    const userB = { username: registerB.user.username, token: registerB.user.token };
    cleanup.registerResource('follow relationship', userB.username, () =>
      profileApiA.unfollowUser(userB.username),
    );
    await expectProfileAvailable(profileApiA, userB.username);

    await profileApiA.followUser(userB.username);

    // Act
    const unfollowRes = await profileApiA.unfollowUser(userB.username);

    // Assert
    expect(unfollowRes.profile.following).toBe(false);
  });

  test(
    'Personal feed shows articles from followed authors @api @critical',
    { tag: ['@critical'] },
    async ({ request, cleanup }) => {
      // Arrange
      // 1. Create User A and User B
      const userAData = new UserBuilder().build();
      const baseClientA = new BaseApiClient(request);
      const authApiA = new AuthApiClient(baseClientA);
      await authApiA.register(userAData);
      const profileApiA = new ProfileApiClient(baseClientA);
      const articleApiA = new ArticleApiClient(baseClientA);

      const userBData = new UserBuilder().build();
      const baseClientB = new BaseApiClient(request);
      const authApiB = new AuthApiClient(baseClientB);
      const registerB = await authApiB.register(userBData);
      const userB = { username: registerB.user.username, token: registerB.user.token };
      cleanup.registerResource('follow relationship', userB.username, () =>
        profileApiA.unfollowUser(userB.username),
      );
      await expectProfileAvailable(profileApiA, userB.username);

      // 2. User A (Test User) follows User B
      await profileApiA.followUser(userB.username);

      // 3. User B creates an article
      const articleApiB = new ArticleApiClient(baseClientB);
      const articleData = new ArticleBuilder()
        .withTitle(`Follower Feed Article - ${Date.now()}`)
        .build();
      const createdArticle = await articleApiB.createArticle(articleData);
      cleanup.registerResource('article', createdArticle.article.slug, () => {
        const cleanupClientB = new BaseApiClient(request, userB.token);
        const cleanupArticleApiB = new ArticleApiClient(cleanupClientB);
        return cleanupArticleApiB.deleteArticle(createdArticle.article.slug);
      });

      // Act: Fetch User A's feed
      const personalFeed = await articleApiA.listFeed();

      // Assert: Seeded article shows in feed
      const titles = personalFeed.articles.map((a) => a.title);
      expect(titles).toContain(articleData.article.title);
    },
  );
});
