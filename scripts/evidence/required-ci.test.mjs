import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { parse } from 'yaml';
import { assertRequiredJobs, requiredJobs } from './required-ci.mjs';

const scheduledJob = 'scheduled-full-cross-browser';
const candidateSharedAppJob = 'candidate-shared-app-ui';
const successful = () =>
  Object.fromEntries([
    ...requiredJobs.map((job) => [job, { result: 'success' }]),
    [candidateSharedAppJob, { result: 'skipped' }],
    [scheduledJob, { result: 'skipped' }],
  ]);

function assertWorkflowMatchesPolicy(workflowNeeds, policyJobs) {
  assert.ok(Array.isArray(workflowNeeds), 'required-ci.needs must be a YAML sequence');
  assert.ok(Array.isArray(policyJobs), 'requiredJobs must be an array');
  assert.equal(new Set(workflowNeeds).size, workflowNeeds.length, 'workflow needs has duplicates');
  assert.equal(new Set(policyJobs).size, policyJobs.length, 'requiredJobs has duplicates');

  const expected = new Set([...policyJobs, candidateSharedAppJob, scheduledJob]);
  assert.deepEqual(
    [...workflowNeeds].sort(),
    [...expected].sort(),
    'required-ci.needs must equal the required and conditional jobs plus the scheduled exception',
  );
}

const workflowText = readFileSync(
  new URL('../../.github/workflows/ci.yml', import.meta.url),
  'utf8',
);
const workflow = parse(workflowText);
const workflowNeeds = workflow?.jobs?.['required-ci']?.needs;

test('PR fast scopes require actual success, allowing only the scheduled tier to skip', () => {
  assert.doesNotThrow(() => assertRequiredJobs(successful(), 'pull_request'));
});

test('candidate dispatch uses candidate-bound UI evidence in place of the pinned target', () => {
  const needs = successful();
  needs['shared-app-ui'] = { result: 'skipped' };
  needs[candidateSharedAppJob] = { result: 'success' };
  assert.doesNotThrow(() => assertRequiredJobs(needs, 'workflow_dispatch'));

  needs['shared-app-ui'] = { result: 'success' };
  assert.throws(() => assertRequiredJobs(needs, 'workflow_dispatch'), /must succeed exactly once/);
  needs['shared-app-ui'] = { result: 'skipped' };
  needs[candidateSharedAppJob] = { result: 'skipped' };
  assert.throws(() => assertRequiredJobs(needs, 'workflow_dispatch'), /must succeed exactly once/);
});

test('mandatory skipped, failed, cancelled or missing child cannot pass the final gate', () => {
  for (const job of requiredJobs)
    for (const result of ['skipped', 'failure', 'cancelled', 'unknown', undefined]) {
      const needs = successful();
      needs[job] = result === undefined ? undefined : { result };
      assert.throws(() => assertRequiredJobs(needs, 'pull_request'), /Required job/);
    }
});

test('reliability-lab must succeed in the aggregate result matrix', () => {
  for (const result of ['success', 'failure', 'cancelled', 'skipped', 'unknown', undefined]) {
    const needs = successful();
    needs['reliability-lab'] = result === undefined ? undefined : { result };
    if (result === 'success') assert.doesNotThrow(() => assertRequiredJobs(needs, 'pull_request'));
    else
      assert.throws(
        () => assertRequiredJobs(needs, 'pull_request'),
        /Required job reliability-lab/,
      );
  }
});

test('browser-trace-contract must succeed in the aggregate result matrix', () => {
  for (const result of ['success', 'failure', 'cancelled', 'skipped', 'unknown', undefined]) {
    const needs = successful();
    needs['browser-trace-contract'] = result === undefined ? undefined : { result };
    if (result === 'success') assert.doesNotThrow(() => assertRequiredJobs(needs, 'pull_request'));
    else
      assert.throws(
        () => assertRequiredJobs(needs, 'pull_request'),
        /Required job browser-trace-contract/,
      );
  }
});

test('unexpected result dependencies cannot pass silently', () => {
  const needs = successful();
  needs['new-required-job'] = { result: 'success' };
  assert.throws(
    () => assertRequiredJobs(needs, 'pull_request'),
    /Unexpected required-ci dependency/,
  );
});

test('scheduled full browsers succeed on schedule and only success or skip elsewhere', () => {
  assert.throws(() => assertRequiredJobs(successful(), 'schedule'), /Scheduled/);
  const needs = successful();
  needs[scheduledJob].result = 'success';
  assert.doesNotThrow(() => assertRequiredJobs(needs, 'schedule'));

  for (const result of ['success', 'skipped', 'failure', 'cancelled', 'unknown', undefined]) {
    const triggerNeeds = successful();
    triggerNeeds[scheduledJob] = result === undefined ? undefined : { result };
    if (['success', 'skipped'].includes(result))
      assert.doesNotThrow(() => assertRequiredJobs(triggerNeeds, 'pull_request'));
    else
      assert.throws(
        () => assertRequiredJobs(triggerNeeds, 'pull_request'),
        /Scheduled cross-browser disposition/,
      );
  }
});

test('workflow required-ci dependencies exactly match the independent policy', () => {
  assertWorkflowMatchesPolicy(workflowNeeds, requiredJobs);
});

test('a workflow-only dependency fails completeness until policy accounts for it', () => {
  const workflowFixture = structuredClone(workflow);
  workflowFixture.jobs['required-ci'].needs.push('workflow-only-required-job');

  assert.throws(
    () => assertWorkflowMatchesPolicy(workflowFixture.jobs['required-ci'].needs, requiredJobs),
    /required-ci\.needs must equal/,
  );
  assert.doesNotThrow(() =>
    assertWorkflowMatchesPolicy(workflowFixture.jobs['required-ci'].needs, [
      ...requiredJobs,
      'workflow-only-required-job',
    ]),
  );
});

test('workflow completeness rejects duplicate and missing required dependencies', () => {
  assert.throws(
    () => assertWorkflowMatchesPolicy([...workflowNeeds, 'reliability-lab'], requiredJobs),
    /workflow needs has duplicates/,
  );
  assert.throws(
    () =>
      assertWorkflowMatchesPolicy(
        workflowNeeds.filter((job) => job !== 'reliability-lab'),
        requiredJobs,
      ),
    /required-ci\.needs must equal/,
  );
});
