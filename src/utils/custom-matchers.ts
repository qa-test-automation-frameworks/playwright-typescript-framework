import { expect as playwrightExpect, APIResponse } from '@playwright/test';

type MatcherResult = {
  message: () => string;
  pass: boolean;
};

type ArticleCandidate = {
  title?: unknown;
  slug?: unknown;
  body?: unknown;
  tagList?: unknown;
  author?: {
    username?: unknown;
  } | null;
};

type UserCandidate = {
  username?: unknown;
  email?: unknown;
  token?: unknown;
};

type ArticlesContainer = {
  articles?: unknown;
};

type ArticleContainer = {
  article?: unknown;
};

type UserContainer = {
  user?: unknown;
};

declare global {
  // Playwright exposes matcher augmentation through this global namespace.
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace PlaywrightTest {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    interface Matchers<R, T = unknown> {
      toBeValidArticle(): R;
      toHaveStatusCode(expectedCode: number): R;
      toHaveStatusCodeIn(expectedCodes: number[]): R;
      toContainArticleWithTitle(expectedTitle: string): R;
      toBeAuthenticatedUser(expectedUsername: string): R;
    }
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const hasArticleContainer = (value: unknown): value is ArticleContainer =>
  isRecord(value) && 'article' in value;

const hasUserContainer = (value: unknown): value is UserContainer =>
  isRecord(value) && 'user' in value;

const hasArticlesContainer = (value: unknown): value is ArticlesContainer =>
  isRecord(value) && 'articles' in value;

const asArticle = (value: unknown): ArticleCandidate | null =>
  isRecord(value) ? (value as ArticleCandidate) : null;

const asUser = (value: unknown): UserCandidate | null =>
  isRecord(value) ? (value as UserCandidate) : null;

const isApiResponse = (value: unknown): value is APIResponse =>
  isRecord(value) && typeof value.status === 'function';

const format = (value: unknown): string => JSON.stringify(value, null, 2);

playwrightExpect.extend({
  toBeValidArticle(received: unknown): MatcherResult {
    const rawArticle = hasArticleContainer(received) ? received.article : received;
    const article = asArticle(rawArticle);
    const author = asUser(article?.author);
    const hasRequired =
      typeof article?.title === 'string' &&
      article.title.length > 0 &&
      typeof article.slug === 'string' &&
      article.slug.length > 0 &&
      typeof article.body === 'string' &&
      Array.isArray(article.tagList) &&
      typeof author?.username === 'string';

    return {
      message: () =>
        hasRequired
          ? 'expected article not to be a valid Article'
          : `expected article to be a valid Article (must contain non-empty title, slug, body, tagList, and author object with username), but got:\n${format(received)}`,
      pass: hasRequired,
    };
  },

  toHaveStatusCode(received: unknown, expectedCode: number): MatcherResult {
    const statusValue = isApiResponse(received)
      ? received.status()
      : isRecord(received) && typeof received.status === 'number'
        ? received.status
        : received;
    const pass = statusValue === expectedCode;

    return {
      message: () =>
        pass
          ? `expected response status not to be ${expectedCode}`
          : `expected response status to be ${expectedCode}, but was ${String(statusValue)}`,
      pass,
    };
  },

  toHaveStatusCodeIn(received: unknown, expectedCodes: number[]): MatcherResult {
    const statusValue = isApiResponse(received)
      ? received.status()
      : isRecord(received) && typeof received.status === 'number'
        ? received.status
        : received;
    const pass = expectedCodes.includes(Number(statusValue));

    return {
      message: () =>
        pass
          ? `expected response status not to be one of ${expectedCodes.join(', ')}`
          : `expected response status to be one of ${expectedCodes.join(', ')}, but was ${String(statusValue)}`,
      pass,
    };
  },

  toContainArticleWithTitle(received: unknown, expectedTitle: string): MatcherResult {
    const articlesSource = Array.isArray(received)
      ? received
      : hasArticlesContainer(received) && Array.isArray(received.articles)
        ? received.articles
        : [];
    const articles = articlesSource
      .map(asArticle)
      .filter((article): article is ArticleCandidate => article !== null);
    const pass = articles.some((article) => article.title === expectedTitle);

    return {
      message: () =>
        pass
          ? `expected articles list not to contain article with title "${expectedTitle}"`
          : `expected articles list to contain article with title "${expectedTitle}" but it did not. Articles present:\n${format(articles.map((article) => article.title))}`,
      pass,
    };
  },

  toBeAuthenticatedUser(received: unknown, expectedUsername: string): MatcherResult {
    const rawUser = hasUserContainer(received) ? received.user : received;
    const user = asUser(rawUser);
    const hasRequired =
      user?.username === expectedUsername &&
      typeof user.email === 'string' &&
      typeof user.token === 'string' &&
      user.token.length > 0;

    return {
      message: () =>
        hasRequired
          ? `expected user not to be authenticated as ${expectedUsername}`
          : `expected user to be authenticated as ${expectedUsername} with a valid token, but received: ${format(received)}`,
      pass: hasRequired,
    };
  },
});
