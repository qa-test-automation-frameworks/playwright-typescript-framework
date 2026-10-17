import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

const baseUrl = process.env.SHARED_APP_BASE_URL;
const expectedSource = process.env.APP_SOURCE_REVISION;
const expectedDigest = process.env.APP_IMAGE_DIGEST;
const fixtureVersion = process.env.APP_FIXTURE_VERSION;
const resultPath = 'test-results/shared-app-rollback/rollback-summary.json';
const checks = [];
const record = {
  check: 'shared-app-immutable-rollback',
  image: process.env.APP_IMAGE,
  digest: expectedDigest,
  sourceRevision: expectedSource,
  fixtureVersion,
  startedAt: new Date().toISOString(),
  checks,
  outcome: 'failed',
};

async function request(path, options = {}) {
  return fetch(new URL(path, baseUrl), {
    ...options,
    headers: {
      ...(options.body ? { 'content-type': 'application/json' } : {}),
      ...options.headers,
    },
    signal: AbortSignal.timeout(5_000),
  });
}

async function waitUntilReady() {
  const deadline = Date.now() + 60_000;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const response = await request('/health/ready');
      assert.equal(response.status, 200, 'readiness must return HTTP 200');
      const ready = await response.json();
      assert.deepEqual(ready, {
        status: 'ready',
        sourceRevision: expectedSource,
        seedVersion: fixtureVersion,
        datastore: true,
      });
      checks.push({ name: 'pinned rollback image readiness and identity', status: 'passed' });
      return;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 1_000));
    }
  }
  throw new Error(`rollback image was not ready within 60 seconds: ${lastError}`);
}

try {
  assert.ok(baseUrl && expectedSource && expectedDigest && fixtureVersion);
  await waitUntilReady();

  const sessionResponse = await request('/api/v1/sessions', {
    method: 'POST',
    body: JSON.stringify({ identityKey: 'member-a' }),
  });
  assert.equal(sessionResponse.status, 201, 'legacy v1 session issuance must remain usable');
  const session = await sessionResponse.json();
  assert.equal(typeof session.token, 'string');
  const headers = { authorization: `Bearer ${session.token}` };

  const policiesResponse = await request('/api/v1/policies', { headers });
  assert.equal(policiesResponse.status, 200, 'legacy v1 policy read must remain usable');
  const policies = await policiesResponse.json();
  const policyId = policies.items?.[0]?.id;
  assert.equal(typeof policyId, 'string', 'rollback image must expose a seeded member policy');

  const atLimitResponse = await request('/api/v1/claims', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      policyId,
      amountMinor: 1_000_000,
      currency: 'USD',
      category: 'auto',
    }),
  });
  assert.equal(atLimitResponse.status, 201, 'rollback must preserve the v1 $10,000 boundary');
  const atLimit = await atLimitResponse.json();
  assert.equal(atLimit.claim?.amountMinor, 1_000_000);
  checks.push({ name: 'API v1 accepts 1,000,000 cents', status: 'passed' });

  const overLimitResponse = await request('/api/v1/claims', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      policyId,
      amountMinor: 1_000_001,
      currency: 'USD',
      category: 'auto',
    }),
  });
  assert.equal(overLimitResponse.status, 422, 'rollback must reject amounts above the v1 limit');
  const overLimit = await overLimitResponse.json();
  assert.equal(overLimit.error?.code, 'VALIDATION_ERROR');
  checks.push({ name: 'API v1 rejects 1,000,001 cents', status: 'passed' });

  record.outcome = 'passed';
} catch (error) {
  record.error = error instanceof Error ? error.message : String(error);
  throw error;
} finally {
  record.completedAt = new Date().toISOString();
  await mkdir('test-results/shared-app-rollback', { recursive: true });
  await writeFile(resultPath, `${JSON.stringify(record, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(record, null, 2)}\n`);
}
