import { readFileSync } from 'node:fs';
import { validateEvidence } from './contract.mjs';
const record = JSON.parse(readFileSync('test-results/evidence-control/evidence-v3.json', 'utf8'));
const native = JSON.parse(readFileSync('test-results/evidence-control/results.json', 'utf8'));
if (process.env.EVIDENCE_TEST_OUTCOME !== 'failure')
  throw new Error('Expected native failure step did not fail');
if (
  validateEvidence(record).length ||
  record.execution.disposition !== 'failed' ||
  record.execution.counts.executed !== 1 ||
  record.execution.counts.failed !== 1
)
  throw new Error('Controlled native failure was not collected correctly');
const errors = native.suites
  .flatMap((suite) => suite.specs ?? [])
  .flatMap((spec) => spec.tests)
  .flatMap((test) => test.results)
  .flatMap((result) => result.errors ?? []);
if (!errors.some((error) => String(error.message).includes('E02_EXPECTED_FAILURE_CONTROL')))
  throw new Error('Negative control failed for an unrelated setup reason');
console.log(
  'Verified real one-case assertion failure and matching failed evidence; no provider/browser target needed',
);
