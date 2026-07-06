/**
 * Deliberately failing tests used to feed chitra with real failure-shaped data.
 *
 * Not part of the real suite's coverage story -- this file exists only on the
 * `chitra/failure-fixtures` branch so we can exercise chitra's failure/lifecycle/
 * flaky reporting against a variety of real failure types (assertion, exception,
 * setup/config error, timeout, flaky) with multiple instances of each. Stash or
 * drop this branch when done; never merge it into a real branch.
 */
import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

test.describe('chitra fixture failures', { tag: ['@api'] }, () => {
  // --- assertion failures ---------------------------------------------------

  test('assertion: wrong status code @api', () => {
    const actualStatus = 404;
    expect(actualStatus).toBe(200);
  });

  test('assertion: wrong response shape @api', () => {
    const actual = { id: '1', title: 'hello', favoritesCount: 0 };
    expect(actual).toEqual({ id: '1', title: 'hello', favoritesCount: 1 });
  });

  test('assertion: array membership @api', () => {
    const tags = ['api', 'contract'];
    expect(tags).toContain('smoke');
  });

  // --- unhandled exceptions --------------------------------------------------

  test('exception: reading property of undefined @api', () => {
    const response: { user?: { token: string } } = {};
    const token = response.user!.token;
    expect(token).toBeTruthy();
  });

  test('exception: JSON.parse of malformed body @api', () => {
    const body: unknown = JSON.parse('{not valid json');
    expect(body).toBeDefined();
  });

  // --- config / setup errors (beforeEach throws -> reported as a test error) -

  test.describe('requires unset env config', () => {
    test.beforeEach(() => {
      const required = process.env.CHITRA_FIXTURE_REQUIRED_TOKEN;
      if (!required) {
        throw new Error('CHITRA_FIXTURE_REQUIRED_TOKEN is not set in the environment');
      }
    });

    test('config error: missing auth token @api', () => {
      expect(true).toBe(true);
    });

    test('config error: missing auth token, second case @api', () => {
      expect(true).toBe(true);
    });
  });

  // --- timeout ----------------------------------------------------------------

  test('timeout: article indexing exceeds budget @api', async () => {
    test.setTimeout(500);
    await new Promise((resolve) => setTimeout(resolve, 2000));
  });

  // --- flaky: oscillates across sequential script invocations -----------------

  const stateDir = path.join(os.tmpdir(), 'chitra-flaky-state');

  function nextCount(name: string): number {
    fs.mkdirSync(stateDir, { recursive: true });
    const stateFile = path.join(stateDir, `playwright-${name}.count`);
    let count = fs.existsSync(stateFile) ? parseInt(fs.readFileSync(stateFile, 'utf8'), 10) : 0;
    count += 1;
    fs.writeFileSync(stateFile, String(count));
    return count;
  }

  test('flaky: comment ordering under load @api', () => {
    const count = nextCount('comment_ordering');
    expect(count % 2, `non-deterministic comment ordering on invocation ${count}`).toBe(1);
  });

  test('flaky: feed pagination race @api', () => {
    const count = nextCount('feed_pagination_race');
    expect(count % 3, `feed pagination race on invocation ${count}`).not.toBe(0);
  });
});
