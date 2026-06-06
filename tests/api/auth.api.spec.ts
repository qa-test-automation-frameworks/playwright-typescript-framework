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
    async ({ createAnonymousAuthApi }) => {
      // Arrange
      const authApi = createAnonymousAuthApi();
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
    async ({ createAnonymousAuthApi }) => {
      // Act
      const authApi = createAnonymousAuthApi();
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

  test('Login with invalid password returns 401 @api', async ({ createAnonymousAuthApi }) => {
    // Arrange
    const authApi = createAnonymousAuthApi();
    const loginData = {
      user: {
        email: config.TEST_USER_EMAIL,
        password: 'WrongPassword!',
      },
    };

    await expectApiError(authApi.login(loginData), 401);
  });

  test('Register with duplicate email returns conflict with descriptive error @api', async ({
    createAnonymousAuthApi,
  }) => {
    // Arrange
    const firstAuthApi = createAnonymousAuthApi();
    const secondAuthApi = createAnonymousAuthApi();
    const firstUser = new UserBuilder().build();
    await firstAuthApi.register(firstUser);

    // Create secondary user with the duplicate email address
    const secondUser = new UserBuilder().withEmail(firstUser.user.email).build();

    await expectApiError(secondAuthApi.register(secondUser), 409, 'email');
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

  test('Get current user without token returns 401 @api', async ({ createAnonymousAuthApi }) => {
    const authApi = createAnonymousAuthApi();
    await expectApiError(authApi.getCurrentUser(), 401);
  });
});
