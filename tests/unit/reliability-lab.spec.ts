import { expect, test } from '@playwright/test';

import { isExpectedOutcome, isSuccessfulTest } from '../../scripts/reliability-lab';

test('Playwright JSON reporter expected status is treated as a successful passing case', () => {
  const testCase = { status: 'expected', expectedStatus: 'passed' } as const;
  expect(isExpectedOutcome(testCase)).toBe(true);
  expect(isSuccessfulTest(testCase)).toBe(true);
});

test('unexpected, flaky, skipped, and expected-failure cases do not count as stable passes', () => {
  expect(isExpectedOutcome({ status: 'unexpected', expectedStatus: 'passed' })).toBe(false);
  expect(isSuccessfulTest({ status: 'unexpected', expectedStatus: 'passed' })).toBe(false);
  expect(isSuccessfulTest({ status: 'flaky', expectedStatus: 'passed' })).toBe(false);
  expect(isSuccessfulTest({ status: 'skipped', expectedStatus: 'passed' })).toBe(false);
  expect(isExpectedOutcome({ status: 'expected', expectedStatus: 'failed' })).toBe(true);
  expect(isSuccessfulTest({ status: 'expected', expectedStatus: 'failed' })).toBe(false);
});
