import assert from 'node:assert/strict';
import test from 'node:test';
import { assertRequiredJobs, requiredJobs } from './required-ci.mjs';
const successful = () =>
  Object.fromEntries([
    ...requiredJobs.map((job) => [job, { result: 'success' }]),
    ['scheduled-full-cross-browser', { result: 'skipped' }],
  ]);
test('PR fast scopes require actual success, allowing only the scheduled tier to skip', () => {
  assert.doesNotThrow(() => assertRequiredJobs(successful(), 'pull_request'));
});
test('mandatory skipped, failed, cancelled or missing child cannot pass the final gate', () => {
  for (const job of requiredJobs)
    for (const result of ['skipped', 'failure', 'cancelled', undefined]) {
      const needs = successful();
      needs[job] = result === undefined ? undefined : { result };
      assert.throws(() => assertRequiredJobs(needs, 'pull_request'), /Required job/);
    }
});
test('scheduled full browsers must actually succeed on the scheduled trigger', () => {
  assert.throws(() => assertRequiredJobs(successful(), 'schedule'), /Scheduled/);
  const needs = successful();
  needs['scheduled-full-cross-browser'].result = 'success';
  assert.doesNotThrow(() => assertRequiredJobs(needs, 'schedule'));
});
