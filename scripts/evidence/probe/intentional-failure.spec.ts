import { expect, test } from '@playwright/test';

test('controlled native failure is retained as failed evidence', () => {
  expect(1, 'E02_EXPECTED_FAILURE_CONTROL').toBe(2);
});
