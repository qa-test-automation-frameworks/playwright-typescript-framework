import { createHash } from 'node:crypto';
import { validateEvidence } from './contract.mjs';

const digest = (value) => createHash('sha256').update(value).digest('hex');
const safeCount = (value) => Number.isSafeInteger(value) && value >= 0;

export function nativeCases(report) {
  const cases = [];
  const seen = new Set();
  function visit(suites) {
    if (!Array.isArray(suites)) throw new Error('Native suites must be an array');
    for (const suite of suites) {
      if (suite.suites !== undefined) visit(suite.suites);
      for (const spec of suite.specs ?? []) {
        if (!spec.id || !Array.isArray(spec.tests))
          throw new Error('Missing native spec/test identity');
        for (const test of spec.tests) {
          if (
            typeof test.projectId !== 'string' ||
            !['expected', 'unexpected', 'flaky', 'skipped'].includes(test.status)
          )
            throw new Error('Missing project or unknown native outcome');
          const id = digest(JSON.stringify([spec.id, test.projectId]));
          if (seen.has(id)) throw new Error('Duplicate native project/spec case');
          seen.add(id);
          if (!Array.isArray(test.results)) throw new Error('Missing native attempts');
          const retries = test.results.map((result) => result.retry);
          if (
            retries.some((retry) => !safeCount(retry)) ||
            new Set(retries).size !== retries.length ||
            retries.some((retry, index) => retry !== index)
          )
            throw new Error('Invalid or duplicated retry attempts');
          const statuses = test.results.map((result) => result.status);
          if (
            statuses.some(
              (status) =>
                !['passed', 'failed', 'timedOut', 'skipped', 'interrupted'].includes(status),
            )
          )
            throw new Error('Unknown native attempt outcome');
          if (test.status !== 'skipped' && !test.results.length)
            throw new Error('Executed case has no native attempt');
          const final = test.results.at(-1);
          if (['expected', 'flaky'].includes(test.status) && final?.status !== test.expectedStatus)
            throw new Error('Expected native case disagrees with final attempt');
          if (test.status === 'flaky' && test.results.length < 2)
            throw new Error('Flaky case has no retry');
          cases.push({
            id,
            project: test.projectId || 'default',
            outcome: test.status,
            retried: test.results.length > 1,
            attempts: statuses,
          });
        }
      }
    }
  }
  visit(report.suites);
  return cases;
}

export function summarizeNative(report) {
  if (!report.stats || !Array.isArray(report.errors))
    throw new Error('Missing native statistics/errors');
  const stats = report.stats;
  if (!['expected', 'unexpected', 'flaky', 'skipped'].every((key) => safeCount(stats[key])))
    throw new Error('Invalid native outcome statistics');
  const start = Date.parse(stats.startTime);
  if (!Number.isFinite(start) || !Number.isFinite(stats.duration) || stats.duration < 0)
    throw new Error('Invalid native timing');
  const cases = nativeCases(report);
  for (const outcome of ['expected', 'unexpected', 'flaky', 'skipped']) {
    if (cases.filter((item) => item.outcome === outcome).length !== stats[outcome])
      throw new Error(`Native ${outcome} statistics do not reconcile to cases`);
  }
  return {
    startedAt: new Date(start).toISOString(),
    completedAt: new Date(start + Math.round(stats.duration)).toISOString(),
    counts: {
      unit: 'parameter_case',
      selected: cases.length,
      executed: cases.filter((item) => item.outcome !== 'skipped').length,
      passed: stats.expected + stats.flaky,
      failed: stats.unexpected,
      skipped: stats.skipped,
      retried: cases.filter((item) => item.retried).length,
      semantics:
        'Unique native spec ID/project cases including setup and teardown. Expected failures count as native expected outcomes. Retried counts unique cases, not extra attempts.',
    },
    cases,
    globalErrorCount: report.errors.length,
    toolVersion: report.config?.version ?? null,
    shard: report.config?.shard ?? null,
  };
}

export function buildEvidence(report, context) {
  const metadata = report.config?.metadata;
  if (
    metadata?.evidenceSourceSha !== context.sourceSha ||
    metadata?.evidenceRunId !== context.workflow.runId ||
    metadata?.evidenceRunAttempt !== String(context.workflow.attempt) ||
    metadata?.evidenceScope !== context.scope
  )
    throw new Error('Native result provenance does not match source/run/attempt/scope');
  const summary = summarizeNative(report);
  if (summary.toolVersion !== context.target.tools.playwright)
    throw new Error('Native Playwright version does not match installed tool');
  const exitFailed = context.testOutcome !== 'success';
  const substantive = summary.counts.executed > 0;
  const failed =
    exitFailed || summary.counts.failed > 0 || summary.globalErrorCount > 0 || !substantive;
  const reasons = [];
  if (exitFailed) reasons.push(`Runner step outcome ${context.testOutcome}`);
  if (summary.counts.failed) reasons.push(`${summary.counts.failed} unexpected final native cases`);
  if (summary.globalErrorCount) reasons.push(`${summary.globalErrorCount} native global errors`);
  if (!substantive) reasons.push('No substantive native execution');
  if (
    context.shardTotal > 1 &&
    (summary.shard?.current !== context.shardCurrent || summary.shard?.total !== context.shardTotal)
  )
    throw new Error('Native shard identity disagrees with declared shard');
  if (context.shardTotal === 1 && summary.shard !== null)
    throw new Error('Unexpected native sharding');
  const shard = `shard-${context.shardCurrent}-of-${context.shardTotal}`;
  const record = {
    schemaVersion: 3,
    kind: 'execution',
    repository: context.repository,
    sourceSha: context.sourceSha,
    workflow: structuredClone(context.workflow),
    scope: {
      id: context.scope,
      required: context.required,
      evidenceClass: context.evidenceClass,
      freshnessPolicy: 'daily_gate_v1',
    },
    target: structuredClone(context.target),
    execution: {
      disposition: context.testOutcome === 'cancelled' ? 'cancelled' : failed ? 'failed' : 'passed',
      reason: reasons.length ? reasons.join('; ') : null,
      startedAt: summary.startedAt,
      completedAt: summary.completedAt,
      integrity: substantive ? 'complete' : 'empty',
      counts: structuredClone(summary.counts),
      measurements: [],
      // One leaf scope per shard. Aggregate scope declares all expected shards later.
      shards: { expected: [shard], received: [shard] },
    },
    publication: {
      disposition: 'pending',
      reason: null,
      publishedAt: null,
      reportUrl: null,
      artifacts: [],
    },
    generator: { name: 'playwright_native_v3', version: '3.0.0' },
    limitations: [
      'Publication pending; E03 artifact references and retention not certified.',
      'Native duration rounded to millisecond manifest precision.',
      ...(context.limitations ?? []),
    ],
  };
  const errors = validateEvidence(record);
  if (errors.length) throw new Error(errors.join('\n'));
  return {
    record,
    summary: {
      ...summary,
      rawAttempts: summary.cases.reduce((n, item) => n + item.attempts.length, 0),
    },
  };
}

export function aggregateShards(leaves, expected) {
  if (
    !Array.isArray(leaves) ||
    !leaves.length ||
    !Array.isArray(expected) ||
    !expected.length ||
    new Set(expected).size !== expected.length
  )
    throw new Error('Missing or duplicate expected shard declarations');
  const reference = leaves[0].record;
  const seen = new Set();
  const caseIds = new Set();
  for (const leaf of leaves) {
    const errors = validateEvidence(leaf.record);
    if (errors.length) throw new Error(errors.join('\n'));
    const r = leaf.record;
    if (
      !Array.isArray(leaf.summary?.cases) ||
      leaf.summary.cases.length !== r.execution.counts.selected ||
      JSON.stringify(leaf.summary.counts) !== JSON.stringify(r.execution.counts)
    )
      throw new Error('Leaf summary does not reconcile to record counts');
    if (
      r.repository !== reference.repository ||
      r.sourceSha !== reference.sourceSha ||
      JSON.stringify(r.workflow) !== JSON.stringify(reference.workflow) ||
      JSON.stringify(r.target) !== JSON.stringify(reference.target) ||
      r.scope.id !== reference.scope.id
    )
      throw new Error('Incompatible repository/source/run/attempt/scope/target');
    const shard = r.execution.shards.received[0];
    if (r.execution.shards.received.length !== 1 || seen.has(shard) || !expected.includes(shard))
      throw new Error('Duplicate or unexpected shard inclusion');
    seen.add(shard);
    for (const item of leaf.summary.cases) {
      // Setup/teardown projects execute once per shard. Preserve those executions
      // as separate shard cases; all business-project cases must be disjoint.
      const id = ['setup', 'teardown'].includes(item.project) ? `${shard}:${item.id}` : item.id;
      if (caseIds.has(id)) throw new Error('Duplicate business-project case across shards');
      caseIds.add(id);
    }
  }
  if (seen.size !== expected.length) throw new Error('Missing required shard');
  const record = structuredClone(reference);
  const fields = ['selected', 'executed', 'passed', 'failed', 'skipped', 'retried'];
  for (const field of fields)
    record.execution.counts[field] = leaves.reduce(
      (n, leaf) => n + leaf.record.execution.counts[field],
      0,
    );
  record.execution.counts.semantics +=
    ' Aggregate includes independently executed setup/teardown per shard; business-project cases cannot overlap.';
  record.execution.startedAt = leaves.map((leaf) => leaf.record.execution.startedAt).sort()[0];
  record.execution.completedAt = leaves
    .map((leaf) => leaf.record.execution.completedAt)
    .sort()
    .at(-1);
  record.execution.shards = { expected, received: [...seen].sort() };
  const failures = leaves.filter((leaf) => leaf.record.execution.disposition !== 'passed');
  record.execution.disposition = failures.length ? 'failed' : 'passed';
  record.execution.reason = failures.length
    ? `${failures.length} non-passing shard executions`
    : null;
  record.execution.integrity = leaves.every(
    (leaf) => leaf.record.execution.integrity === 'complete',
  )
    ? 'complete'
    : 'partial';
  const errors = validateEvidence(record);
  if (errors.length) throw new Error(errors.join('\n'));
  return record;
}
