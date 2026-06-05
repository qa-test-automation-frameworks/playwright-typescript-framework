import { test, expect } from '@src/fixtures';

test.describe('E2E: Network Resilience', { tag: ['@ui'] }, () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('Login API failure shows validation feedback @ui', async ({ page, authPage }) => {
    await page.route('**/users/login', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ errors: { body: ['email or password is invalid'] } }),
      });
    });

    await authPage.navigateToLogin();
    await authPage.loginUser({
      user: {
        email: 'blocked-user@example.test',
        password: 'invalid-password',
      },
    });

    await expect(authPage.validationErrors).toContainText(/email|password|invalid/i);
  });
});
