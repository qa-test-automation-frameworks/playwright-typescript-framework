import * as fs from 'fs';
import * as path from 'path';
import { BrowserContext } from '@playwright/test';
import { User } from '../api/models/auth.model';

export const AUTH_DIR = path.resolve(process.cwd(), '.auth');
export const USER_STATE_PATH = path.join(AUTH_DIR, 'user.json');
export const SEED_STATE_PATH = path.join(AUTH_DIR, 'seed.json');
export const TOKEN_STORAGE_KEYS = ['jwtToken', 'jwt', 'token'] as const;

export type StorageState = {
  cookies: unknown[];
  origins: Array<{
    origin: string;
    localStorage: Array<{ name: string; value: string }>;
  }>;
};

export type SeedState = {
  slug: string;
  username: string;
  createdAt: string;
};

export function ensureAuthDirectory(): void {
  if (!fs.existsSync(AUTH_DIR)) {
    fs.mkdirSync(AUTH_DIR, { recursive: true });
  }
}

export function createStorageState(origin: string, user: User): StorageState {
  return {
    cookies: [],
    origins: [
      {
        origin,
        localStorage: [
          { name: 'jwtToken', value: user.token },
          { name: 'jwt', value: user.token },
          { name: 'token', value: user.token },
          { name: 'user', value: JSON.stringify(user) },
        ],
      },
    ],
  };
}

export async function installUserToken(
  context: BrowserContext,
  token: string,
  user?: Partial<User>,
): Promise<void> {
  await context.addInitScript(
    ({ tokenValue, userValue, tokenStorageKeys }) => {
      for (const key of tokenStorageKeys) {
        window.localStorage.setItem(key, tokenValue);
      }

      if (userValue) {
        window.localStorage.setItem('user', JSON.stringify(userValue));
      }
    },
    {
      tokenValue: token,
      userValue: user,
      tokenStorageKeys: [...TOKEN_STORAGE_KEYS],
    },
  );
}

export function writeUserStorageState(origin: string, user: User): void {
  ensureAuthDirectory();
  fs.writeFileSync(
    USER_STATE_PATH,
    JSON.stringify(createStorageState(origin, user), null, 2),
    'utf-8',
  );
}

export function writeSeedState(seed: SeedState): void {
  ensureAuthDirectory();
  fs.writeFileSync(SEED_STATE_PATH, JSON.stringify(seed, null, 2), 'utf-8');
}

export function readSeedState(): SeedState | null {
  if (!fs.existsSync(SEED_STATE_PATH)) {
    return null;
  }

  return JSON.parse(fs.readFileSync(SEED_STATE_PATH, 'utf8')) as SeedState;
}

export function readUserStorageState(): StorageState | null {
  if (!fs.existsSync(USER_STATE_PATH)) {
    return null;
  }

  return JSON.parse(fs.readFileSync(USER_STATE_PATH, 'utf8')) as StorageState;
}

export function extractTokenFromStorageState(state: StorageState | null): string {
  if (!state) {
    return '';
  }

  for (const originInfo of state.origins) {
    const tokenItem = originInfo.localStorage.find((item) =>
      TOKEN_STORAGE_KEYS.some((key) => item.name === key),
    );

    if (tokenItem) {
      return tokenItem.value;
    }
  }

  return '';
}

export function readStoredUserToken(): string {
  return extractTokenFromStorageState(readUserStorageState());
}

export function deleteSeedState(): void {
  if (fs.existsSync(SEED_STATE_PATH)) {
    fs.unlinkSync(SEED_STATE_PATH);
  }
}
