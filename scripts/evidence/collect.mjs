import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { inspectCheckout } from './checkout.mjs';
import { buildEvidence } from './playwright.mjs';
import { validateEvidence } from './contract.mjs';

const env = process.env;
const input = process.argv[2] ?? 'test-results/results.json';
const output = process.argv[3] ?? 'test-results/evidence-v3.json';
const required = (name) => {
  if (!env[name]) throw new Error(`Required evidence context ${name} is missing`);
  return env[name];
};
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
function targetDigest() {
  const paths = [];
  function visit(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true }).sort((a, b) =>
      a.name.localeCompare(b.name),
    )) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) visit(path);
      else if (entry.isFile()) paths.push(path);
      else throw new Error('Target contains a non-regular entry');
    }
  }
  visit('test-target');
  paths.push('scripts/target-seed.js', 'package-lock.json');
  return `sha256:${hash(Buffer.concat(paths.map((path) => Buffer.concat([Buffer.from(`${path.replaceAll('\\', '/')}\0`), readFileSync(path), Buffer.from('\0')]))))}`;
}

const sourceSha = inspectCheckout(required('GITHUB_SHA'));
const scopeProjects = {
  'framework-unit': ['default'],
  'evidence-negative-control': ['evidence-control'],
  api: ['api'],
  e2e: ['chromium-authenticated', 'chromium-anonymous'],
  visual: ['visual'],
  accessibility: ['accessibility'],
  'selector-contract': ['selector-contract'],
  'cross-browser': ['firefox-smoke', 'webkit-smoke', 'mobile-chrome-smoke'],
  'firefox-regression': ['firefox-regression'],
  'webkit-regression': ['webkit-regression'],
  'mobile-chrome-regression': ['mobile-chrome-regression'],
};
const businessProjects = scopeProjects[required('EVIDENCE_SCOPE')];
if (!businessProjects) throw new Error('Unknown evidence suite scope');
const context = {
  repository: required('GITHUB_REPOSITORY'),
  sourceSha,
  workflow: {
    id: 'ci.yml',
    name: required('GITHUB_WORKFLOW'),
    runId: required('GITHUB_RUN_ID'),
    attempt: Number(required('GITHUB_RUN_ATTEMPT')),
    url: `https://github.com/${env.GITHUB_REPOSITORY}/actions/runs/${env.GITHUB_RUN_ID}`,
    trigger: required('GITHUB_EVENT_NAME'),
    branch: required('GITHUB_REF_NAME'),
  },
  scope: required('EVIDENCE_SCOPE'),
  projects: { allowed: [...businessProjects, 'setup', 'teardown'], business: businessProjects },
  required: env.EVIDENCE_REQUIRED !== 'false',
  evidenceClass: env.EVIDENCE_CLASS ?? 'controlled',
  testOutcome: required('EVIDENCE_TEST_OUTCOME'),
  shardCurrent: Number(env.EVIDENCE_SHARD_CURRENT ?? 1),
  shardTotal: Number(env.EVIDENCE_SHARD_TOTAL ?? 1),
  target: {
    identity: env.EVIDENCE_CLASS === 'hermetic' ? 'framework-unit-fakes' : 'owned-conduit-target',
    revision: env.EVIDENCE_CLASS === 'hermetic' ? `git:${sourceSha}` : targetDigest(),
    fixtureVersion:
      env.EVIDENCE_CLASS === 'hermetic'
        ? `git-${sourceSha}`
        : `sha256-${hash(readFileSync('scripts/target-seed.js'))}`,
    environment: `github_actions-${required('RUNNER_OS').toLowerCase()}`,
    profile: required('EVIDENCE_SCOPE'),
    tools: {
      node: process.versions.node,
      playwright: JSON.parse(readFileSync('node_modules/@playwright/test/package.json', 'utf8'))
        .version,
    },
  },
  limitations: [
    env.EVIDENCE_CLASS === 'hermetic'
      ? 'Hermetic fakes/probe are versioned in the tested source; no target service or browser is contacted.'
      : 'Target digest covers owned target files, seed implementation and dependency lock; target is co-versioned with the framework, not independently deployed.',
  ],
};
if (!['success', 'failure', 'cancelled', 'skipped'].includes(context.testOutcome))
  throw new Error('Unknown runner step outcome');
if (
  ![context.shardCurrent, context.shardTotal].every((n) => Number.isSafeInteger(n) && n > 0) ||
  context.shardCurrent > context.shardTotal
)
  throw new Error('Invalid shard context');
let record;
let summary;
try {
  if (!existsSync(input)) throw new Error('Native result file is missing');
  const bytes = readFileSync(input);
  const native = JSON.parse(bytes.toString('utf8'));
  ({ record, summary } = buildEvidence(native, context));
  summary.inputSha256 = hash(bytes);
} catch (error) {
  record = {
    schemaVersion: 3,
    kind: 'execution',
    repository: context.repository,
    sourceSha,
    workflow: context.workflow,
    scope: {
      id: context.scope,
      required: context.required,
      evidenceClass: context.evidenceClass,
      freshnessPolicy: 'daily_gate_v1',
    },
    target: context.target,
    execution: {
      disposition: 'unavailable',
      reason: 'Native input absent or invalid; collection did not certify execution',
      startedAt: null,
      completedAt: null,
      integrity: 'unavailable',
      counts: {
        unit: 'parameter_case',
        selected: null,
        executed: null,
        passed: null,
        failed: null,
        skipped: null,
        retried: null,
        semantics: 'Unknown native counts; never substituted with zero.',
      },
      measurements: [],
      shards: {
        expected: [`shard-${context.shardCurrent}-of-${context.shardTotal}`],
        received: [],
      },
    },
    publication: {
      disposition: 'pending',
      reason: null,
      publishedAt: null,
      reportUrl: null,
      artifacts: [],
    },
    generator: { name: 'playwright_native_v3', version: '3.0.0' },
    limitations: context.limitations,
  };
  // Do not copy native error text, request contents or test titles into public manifests.
  console.error(`Evidence collection failed: ${error.name}`);
  process.exitCode = 1;
}
const errors = validateEvidence(record);
if (errors.length) throw new Error(errors.join('\n'));
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(record, null, 2)}\n`);
if (summary)
  writeFileSync(
    output.replace(/\.json$/, '.native-summary.json'),
    `${JSON.stringify(summary, null, 2)}\n`,
  );
if (context.testOutcome === 'success' && record.execution.disposition !== 'passed')
  process.exitCode = 1;
console.log(
  `Evidence ${context.scope}: ${record.execution.disposition}; publication ${record.publication.disposition}`,
);
