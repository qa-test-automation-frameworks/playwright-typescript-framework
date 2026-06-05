import { test, expect } from '@src/fixtures';
import { UserBuilder } from '@src/builders/UserBuilder';
import { config } from '@src/utils/config';
import { BaseApiClient } from '@src/api/BaseApiClient';
import { AuthApiClient } from '@src/api/clients/AuthApiClient';
import { expectApiError } from '@src/utils/api-assertions';

test.describe('API: Authentication', { tag: ['@api'] }, () => {
  test(
    'Register a new user successfully @smoke @api',
    { tag: ['@smoke', '@api'] },
    async ({ authApi }) => {
      // Arrange
      const registerData = new UserBuilder().build();

      // Act
      const response = await authApi.register(registerData);

      // Assert
      expect(response).toBeAuthenticatedUser(registerData.user.username);
    },
  );

  test(
    'Login with valid credentials returns JWT @smoke @api',
    { tag: ['@smoke', '@api'] },
    async ({ authApi }) => {
      // Act
      const response = await authApi.login({
        user: {
          email: config.TEST_USER_EMAIL,
          password: config.TEST_USER_PASSWORD,
        },
      });

      // Assert
      expect(response).toBeAuthenticatedUser(config.TEST_USER_USERNAME);
    },
  );

  test('Login with invalid password returns 401 @api', async ({ authApi }) => {
    // Arrange
    const loginData = {
      user: {
        email: config.TEST_USER_EMAIL,
        password: 'WrongPassword!',
      },
    };

    await expectApiError(authApi.login(loginData), 401);
  });

  test('Register with duplicate email returns conflict with descriptive error @api', async ({
    authApi,
  }) => {
    // Arrange
    const firstUser = new UserBuilder().build();
    await authApi.register(firstUser);

    // Create secondary user with the duplicate email address
    const secondUser = new UserBuilder().withEmail(firstUser.user.email).build();

    await expectApiError(authApi.register(secondUser), 409, 'email');
  });

  test('Get current user with valid token @api', async ({ request }) => {
    // Arrange
    const client = new BaseApiClient(request);
    const authApi = new AuthApiClient(client);
    const userData = new UserBuilder().build();
    const registered = await authApi.register(userData);

    // Act
    const response = await authApi.getCurrentUser();

    // Assert
    expect(response).toBeAuthenticatedUser(registered.user.username);
    expect(response.user.email).toBe(registered.user.email);
  });

  test('Get current user without token returns 401 @api', async ({ baseApiClient, authApi }) => {
    // Arrange
    baseApiClient.setToken(null);

    await expectApiError(authApi.getCurrentUser(), 401);
  });
});
