import { test, expect } from '@src/fixtures';
import { UserBuilder } from '@src/builders/UserBuilder';
import { config } from '@src/utils/config';

test.describe('E2E: Authentication', { tag: ['@ui'] }, () => {
  // Force empty state to start unauthenticated
  test.use({ storageState: { cookies: [], origins: [] } });

  test(
    'User can register a new account and land on home feed @smoke @ui',
    { tag: ['@smoke', '@ui'] },
    async ({ authPage }) => {
      // Arrange
      const user = new UserBuilder().build();

      // Act
      await authPage.navigateToRegister();
      await authPage.registerUserAndWaitForSession(user);

      // Assert
      await expect(authPage.header.profileLink).toBeVisible({ timeout: 10000 });
      await expect(authPage.header.newArticleLink).toBeVisible();
      await expect(authPage.header.profileLink).toContainText(user.user.username, {
        ignoreCase: true,
      });
    },
  );

  test(
    'User can login with valid credentials @smoke @ui',
    { tag: ['@smoke', '@ui'] },
    async ({ authPage }) => {
      // Act
      await authPage.navigateToLogin();
      await authPage.loginUserAndWaitForSession({
        user: {
          email: config.TEST_USER_EMAIL,
          password: config.TEST_USER_PASSWORD,
        },
      });

      // Assert
      await expect(authPage.header.profileLink).toBeVisible({ timeout: 10000 });
      await expect(authPage.header.newArticleLink).toBeVisible();
      await expect(authPage.header.profileLink).toContainText(config.TEST_USER_USERNAME, {
        ignoreCase: true,
      });
    },
  );

  test('Login with wrong password shows validation error @ui', async ({ authPage }) => {
    // Act
    await authPage.navigateToLogin();
    await authPage.loginUser({
      user: {
        email: config.TEST_USER_EMAIL,
        password: 'WrongPassword!',
      },
    });

    // Assert
    const errors = await authPage.getValidationErrors();
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.join(' ').toLowerCase()).toMatch(/email|password|invalid/);
  });

  test('User can logout and is redirected to home @ui', async ({ authPage, settingsPage }) => {
    // Arrange: Perform login
    await authPage.navigateToLogin();
    await authPage.loginUserAndWaitForSession({
      user: {
        email: config.TEST_USER_EMAIL,
        password: config.TEST_USER_PASSWORD,
      },
    });
    await expect(authPage.header.profileLink).toBeVisible({ timeout: 10000 });

    // Act
    await settingsPage.navigate();
    await settingsPage.logout();

    // Assert
    await expect(authPage.header.signInLink).toBeVisible();
    await expect(authPage.header.signUpLink).toBeVisible();
  });
});
