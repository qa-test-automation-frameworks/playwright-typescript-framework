import { test, expect } from '@playwright/test';
import {
  createStorageState,
  extractTokenFromStorageState,
  TOKEN_STORAGE_KEYS,
} from '@src/utils/auth-state';
import { User } from '@src/api/models/auth.model';

test.describe('Contract: auth storage state helpers', { tag: ['@contract'] }, () => {
  test('createStorageState writes every supported token key for the controlled UI', () => {
    const user: User = {
      email: 'contract.user@example.test',
      token: 'contract-token',
      username: 'contractuser',
      bio: null,
      image: null,
    };

    const state = createStorageState('http://127.0.0.1:4300', user);
    const localStorage = state.origins[0]?.localStorage ?? [];
    const storageNames = localStorage.map((item) => item.name);

    for (const tokenKey of TOKEN_STORAGE_KEYS) {
      expect.soft(storageNames).toContain(tokenKey);
      expect.soft(localStorage.find((item) => item.name === tokenKey)?.value).toBe(user.token);
    }

    expect
      .soft(localStorage.find((item) => item.name === 'user')?.value)
      .toBe(JSON.stringify(user));
  });

  test('extractTokenFromStorageState reads the first supported token key', () => {
    const state = {
      cookies: [],
      origins: [
        {
          origin: 'http://127.0.0.1:4300',
          localStorage: [{ name: TOKEN_STORAGE_KEYS[1], value: 'jwt-token-value' }],
        },
      ],
    };

    expect(extractTokenFromStorageState(state)).toBe('jwt-token-value');
  });
});
