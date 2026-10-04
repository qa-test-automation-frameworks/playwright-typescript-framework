import assert from 'node:assert/strict';
import test from 'node:test';
import { aggregateShards, buildEvidence, summarizeNative } from './playwright.mjs';

const context = {
  repository: 'qa-test-automation-frameworks/playwright-typescript-framework',
  sourceSha: 'a'.repeat(40),
  workflow: {
    id: 'ci.yml',
    name: 'Synthetic adapter fixture',
    runId: '1001',
    attempt: 1,
    url: 'https://github.com/qa-test-automation-frameworks/playwright-typescript-framework/actions/runs/1001',
    trigger: 'pull_request',
    branch: 'fixture/evidence',
  },
  scope: 'e2e',
  required: true,
  evidenceClass: 'controlled',
  testOutcome: 'success',
  shardCurrent: 1,
  shardTotal: 1,
  target: {
    identity: 'synthetic-owned-target',
    revision: 'fixture-v1',
    fixtureVersion: 'fixture-v1',
    environment: 'isolated_ci',
    profile: 'e2e',
    tools: { playwright: '1.60.0' },
  },
  limitations: ['Synthetic adapter fixture only; not actual run evidence.'],
};
function fixture(outcomes = ['expected']) {
  const config = {
    version: '1.60.0',
    shard: null,
    metadata: {
      evidenceSourceSha: context.sourceSha,
      evidenceRunId: context.workflow.runId,
      evidenceRunAttempt: '1',
      evidenceScope: context.scope,
    },
  };
  const stats = {
    startTime: '2026-10-04T08:00:00.000Z',
    duration: 1250,
    expected: 0,
    unexpected: 0,
    flaky: 0,
    skipped: 0,
  };
  const specs = outcomes.map((outcome, i) => {
    stats[outcome]++;
    const results =
      outcome === 'skipped'
        ? []
        : outcome === 'flaky'
          ? [
              { status: 'failed', retry: 0 },
              { status: 'passed', retry: 1 },
            ]
          : [{ status: outcome === 'unexpected' ? 'failed' : 'passed', retry: 0 }];
    return {
      id: `native-spec-${i}`,
      tests: [
        {
          projectId: 'chromium',
          projectName: 'chromium',
          expectedStatus: 'passed',
          status: outcome,
          results,
        },
      ],
    };
  });
  return { config, suites: [{ suites: [{ specs }] }], errors: [], stats };
}

test('final cases reconcile; retries remain attempts rather than extra tests', () => {
  const { record, summary } = buildEvidence(fixture(['expected', 'flaky', 'skipped']), context);
  assert.deepEqual(
    {
      selected: record.execution.counts.selected,
      executed: record.execution.counts.executed,
      passed: record.execution.counts.passed,
      skipped: record.execution.counts.skipped,
      retried: record.execution.counts.retried,
      attempts: summary.rawAttempts,
    },
    { selected: 3, executed: 2, passed: 2, skipped: 1, retried: 1, attempts: 3 },
  );
});
test('expected native failures retain Playwright final-outcome semantics', () => {
  const report = fixture();
  report.suites[0].suites[0].specs[0].tests[0].expectedStatus = 'failed';
  report.suites[0].suites[0].specs[0].tests[0].results[0].status = 'failed';
  assert.equal(buildEvidence(report, context).record.execution.disposition, 'passed');
});
test('native assertion failure and runner failure remain failed evidence', () => {
  const leaf = buildEvidence(fixture(['unexpected']), { ...context, testOutcome: 'failure' });
  assert.equal(leaf.record.execution.disposition, 'failed');
  assert.equal(leaf.record.execution.counts.failed, 1);
  assert.equal(
    buildEvidence(fixture(), { ...context, testOutcome: 'failure' }).record.execution.disposition,
    'failed',
  );
});
test('empty collection and all-skipped selection cannot pass', () => {
  for (const outcomes of [[], ['skipped']]) {
    const record = buildEvidence(fixture(outcomes), context).record;
    assert.equal(record.execution.disposition, 'failed');
    assert.equal(record.execution.integrity, 'empty');
  }
});
test('native globals fail execution despite passing cases', () => {
  const report = fixture();
  report.errors.push({ message: 'Synthetic setup error containing untrusted text' });
  const record = buildEvidence(report, context).record;
  assert.equal(record.execution.disposition, 'failed');
  assert.ok(!JSON.stringify(record).includes('untrusted text'));
});
test('native statistics, duplicate identities and missing attempts fail closed', () => {
  let report = fixture();
  report.stats.expected++;
  assert.throws(() => summarizeNative(report), /reconcile/);
  report = fixture();
  report.suites[0].suites[0].specs.push(structuredClone(report.suites[0].suites[0].specs[0]));
  assert.throws(() => summarizeNative(report), /Duplicate/);
  report = fixture();
  report.suites[0].suites[0].specs[0].tests[0].results = [];
  assert.throws(() => summarizeNative(report), /no native attempt/);
});
test('missing retry attempt and final outcome disagreement are rejected', () => {
  let report = fixture(['flaky']);
  report.suites[0].suites[0].specs[0].tests[0].results[1].retry = 2;
  assert.throws(() => summarizeNative(report), /retry/);
  report = fixture();
  report.suites[0].suites[0].specs[0].tests[0].results[0].status = 'failed';
  assert.throws(() => summarizeNative(report), /final attempt/);
});
test('old source, run attempt or scope cannot reuse a native input', () => {
  for (const key of ['evidenceSourceSha', 'evidenceRunId', 'evidenceRunAttempt', 'evidenceScope']) {
    const report = fixture();
    report.config.metadata[key] = 'different';
    assert.throws(() => buildEvidence(report, context), /provenance/);
  }
});
function shard(current, id, project = 'chromium') {
  const report = fixture();
  report.config.shard = { current, total: 2 };
  const spec = report.suites[0].suites[0].specs[0];
  spec.id = id;
  spec.tests[0].projectId = project;
  return buildEvidence(report, { ...context, shardCurrent: current, shardTotal: 2 });
}
test('complete shards aggregate actual cases while missing or duplicate inclusion fails', () => {
  const leaves = [shard(1, 'first'), shard(2, 'second')];
  assert.equal(
    aggregateShards(leaves, ['shard-1-of-2', 'shard-2-of-2']).execution.counts.executed,
    2,
  );
  assert.throws(
    () => aggregateShards([leaves[0]], ['shard-1-of-2', 'shard-2-of-2']),
    /Missing required/,
  );
  assert.throws(
    () => aggregateShards([leaves[0], leaves[0]], ['shard-1-of-2', 'shard-2-of-2']),
    /Duplicate/,
  );
});
test('business cases cannot overlap while separate setup executions are retained', () => {
  assert.throws(
    () => aggregateShards([shard(1, 'same'), shard(2, 'same')], ['shard-1-of-2', 'shard-2-of-2']),
    /Duplicate business/,
  );
  const record = aggregateShards(
    [shard(1, 'same', 'setup'), shard(2, 'same', 'setup')],
    ['shard-1-of-2', 'shard-2-of-2'],
  );
  assert.equal(record.execution.counts.executed, 2);
});
test('native shard, source, target and run attempt identities cannot be mixed', () => {
  assert.throws(
    () => buildEvidence(fixture(), { ...context, shardCurrent: 1, shardTotal: 2 }),
    /shard identity/,
  );
  for (const mutate of [
    (leaf) => (leaf.record.sourceSha = 'b'.repeat(40)),
    (leaf) => (leaf.record.workflow.attempt = 2),
    (leaf) => (leaf.record.target.revision = 'different'),
  ]) {
    const leaves = [shard(1, 'first'), shard(2, 'second')];
    mutate(leaves[1]);
    assert.throws(() => aggregateShards(leaves, ['shard-1-of-2', 'shard-2-of-2']), /Incompatible/);
  }
});
test('leaf summaries must reconcile before aggregation', () => {
  const leaves = [shard(1, 'first'), shard(2, 'second')];
  leaves[1].summary.cases = [];
  assert.throws(() => aggregateShards(leaves, ['shard-1-of-2', 'shard-2-of-2']), /reconcile/);
});

test('unnamed native default project has a stable case identity', () => {
  const report = fixture();
  report.suites[0].suites[0].specs[0].tests[0].projectId = '';
  const leaf = buildEvidence(report, context);
  assert.equal(leaf.summary.cases[0].project, 'default');
});
