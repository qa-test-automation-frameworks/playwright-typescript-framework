const { spawnSync } = require('child_process');
const { mkdirSync, readFileSync, unlinkSync, writeFileSync } = require('fs');
const { join } = require('path');

const outputDir = join(process.cwd(), 'work', 'reliability-lab');
const targetRunner = join(process.cwd(), 'scripts', 'target-runner.js');
const mode = process.argv[2] || 'faults';
const nodeVersion = process.version;
const { version: playwrightVersion } = require('@playwright/test/package.json');
mkdirSync(outputDir, { recursive: true });

const faults = [
  {
    name: 'selector',
    title: 'controlled UI selector contract',
    diagnostic: /article-title|Expected:|Received:/i,
    args: [
      'tests/contracts/selectors/controlled-ui.selectors.spec.ts',
      '--project=selector-contract',
      '--grep',
      'feed exposes article-card selector surfaces',
    ],
  },
  {
    name: 'api-schema',
    title: 'API response schema',
    diagnostic: /articles|ZodError|expected array/i,
    args: [
      'tests/api/articles.api.spec.ts',
      '--project=api',
      '--grep',
      'List articles with tag filter',
    ],
  },
  {
    name: 'accessibility',
    title: 'accessibility rule',
    diagnostic: /aria-hidden-focus|Intentional accessibility fault|violations/i,
    args: [
      'tests/accessibility/critical-pages.accessibility.spec.ts',
      '--project=accessibility',
      '--grep',
      'Login page has no detectable WCAG violations',
    ],
  },
  {
    name: 'visual',
    title: 'visual comparison',
    diagnostic: /Screenshot comparison failed|home-feed-guest|pixels/i,
    args: [
      'tests/visual/critical-pages.visual.spec.ts',
      '--project=visual',
      '--grep',
      'Home feed matches baseline',
    ],
  },
  {
    name: 'cleanup',
    title: 'cleanup lifecycle',
    diagnostic: /Cleanup failed for resources|intentional cleanup reliability fault/i,
    args: ['tests/api/articles.api.spec.ts', '--project=api', '--grep', 'Get article by slug'],
  },
];

function execute(name, args, extraEnv = {}) {
  const targetPort = String(extraEnv.TARGET_PORT || 4300);
  try {
    unlinkSync(join(process.cwd(), 'test-results', 'results.json'));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  return spawnSync(process.execPath, [targetRunner, 'npx', 'playwright', 'test', ...args], {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: {
      ...process.env,
      CONTROLLED_TARGET_MODE: '1',
      RELIABILITY_FAULT: name || '',
      TARGET_PORT: targetPort,
      BASE_URL: `http://127.0.0.1:${targetPort}`,
      API_URL: `http://127.0.0.1:${targetPort}/api`,
      TEST_USER_EMAIL: 'reliability-lab@example.test',
      TEST_USER_PASSWORD: 'synthetic-reliability-lab-password',
      TEST_USER_USERNAME: 'reliabilitylab',
      ...extraEnv,
    },
    maxBuffer: 16 * 1024 * 1024,
    timeout: 120_000,
  });
}

function parseResultFile() {
  try {
    return JSON.parse(readFileSync(join(process.cwd(), 'test-results', 'results.json'), 'utf8'));
  } catch {
    return null;
  }
}

function gatherTests(suites, rows = []) {
  for (const suite of suites || []) {
    gatherTests(suite.suites, rows);
    for (const spec of suite.specs || []) {
      for (const test of spec.tests || []) {
        rows.push({
          title: spec.title,
          project: test.projectName,
          status: test.status,
          expectedStatus: test.expectedStatus,
          results: test.results || [],
        });
      }
    }
  }
  return rows;
}

function isExpectedOutcome(test) {
  // Playwright's JSON reporter uses `status: expected|unexpected|flaky|skipped`;
  // `expectedStatus` is the underlying result (`passed`, `failed`, etc.).
  return test.status === 'expected';
}

function isSuccessfulTest(test) {
  return isExpectedOutcome(test) && test.expectedStatus === 'passed';
}

function runFaultControls() {
  const results = [];
  for (const [index, fault] of faults.entries()) {
    const result = execute(fault.name, fault.args, { CI: 'true', TARGET_PORT: 4310 + index });
    const output = `${result.stdout || ''}\n${result.stderr || ''}${result.error ? `\nChild process could not start: ${result.error.message}\n` : ''}`;
    writeFileSync(join(outputDir, `${fault.name}.log`), output);
    const diagnosticObserved = fault.diagnostic.test(output);
    const detected = !result.error && result.status !== 0 && diagnosticObserved;
    results.push({
      fault: fault.name,
      gate: fault.title,
      exitCode: result.status,
      ...(result.error ? { spawnError: result.error.message } : {}),
      diagnosticObserved,
      detected,
    });
    process.stdout.write(`${detected ? 'DETECTED' : 'MISSED'} ${fault.name}: ${fault.title}\n`);
  }
  const report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    target: 'repo-owned controlled RealWorld target',
    environment: {
      node: nodeVersion,
      playwright: playwrightVersion,
      platform: process.platform,
      architecture: process.arch,
    },
    controls: results,
    detected: results.filter((item) => item.detected).length,
    expected: faults.length,
  };
  writeFileSync(join(outputDir, 'fault-controls.json'), `${JSON.stringify(report, null, 2)}\n`);
  if (report.detected !== report.expected) process.exitCode = 1;
}

function runRepeatedProfile() {
  const countArg = Number(process.argv[3] || 20);
  if (!Number.isSafeInteger(countArg) || countArg < 20 || countArg > 50) {
    throw new Error(
      'Repeated reliability sample must be between 20 and 50 independent target runs.',
    );
  }
  const profile = [
    'tests/api/articles.api.spec.ts',
    '--project=api',
    '--grep',
    'List articles with tag filter',
    '--workers=1',
    '--retries=0',
  ];
  const runs = [];
  for (let index = 1; index <= countArg; index += 1) {
    const started = Date.now();
    const result = execute('', profile, { CI: 'true', TARGET_PORT: 4400 + index });
    const payload = parseResultFile();
    const tests = gatherTests(payload?.suites ?? []);
    const attemptStatuses = tests.flatMap((item) => item.results.map((attempt) => attempt.status));
    const passed = result.status === 0 && tests.length > 0 && tests.every(isSuccessfulTest);
    runs.push({
      iteration: index,
      passed,
      exitCode: result.status,
      totalTests: tests.length,
      expectedOutcomes: tests.filter(isExpectedOutcome).length,
      firstAttemptFailures: attemptStatuses.filter((status) => status !== 'passed').length,
      retries: tests.reduce((total, item) => total + Math.max(0, item.results.length - 1), 0),
      skipped: tests.filter((item) => item.status === 'skipped').length,
      wallSeconds: Number(((Date.now() - started) / 1000).toFixed(3)),
    });
    process.stdout.write(
      `${passed ? 'PASS' : 'FAIL'} repeat ${index}/${countArg} (${runs.at(-1).wallSeconds}s)\n`,
    );
    if (result.error) runs.at(-1).error = result.error.message;
    if (result.signal) runs.at(-1).signal = result.signal;
  }
  const report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    target: 'repo-owned controlled RealWorld target; reset by new process per sample',
    profile: 'API list articles with tag filter; one worker; retries disabled',
    environment: {
      node: nodeVersion,
      playwright: playwrightVersion,
      platform: process.platform,
      architecture: process.arch,
    },
    sampleSize: countArg,
    firstAttemptOutcomes: {
      failures: runs.reduce((total, run) => total + run.firstAttemptFailures, 0),
      retries: runs.reduce((total, run) => total + run.retries, 0),
      skips: runs.reduce((total, run) => total + run.skipped, 0),
    },
    successfulRuns: runs.filter((run) => run.passed).length,
    wallSeconds: Number(runs.reduce((total, run) => total + run.wallSeconds, 0).toFixed(3)),
    runs,
    limitation:
      'A 20-run local target sample is an initial reliability observation, not a universal or production flake-rate guarantee.',
  };
  writeFileSync(join(outputDir, 'repeated-profile.json'), `${JSON.stringify(report, null, 2)}\n`);
  const lines = [
    '# Playwright reliability sample',
    '',
    `Sample: ${report.successfulRuns}/${countArg} successful independent target runs.`,
    `Profile: ${report.profile}.`,
    `First-attempt failures: ${report.firstAttemptOutcomes.failures}; retries: ${report.firstAttemptOutcomes.retries}; skips: ${report.firstAttemptOutcomes.skips}.`,
    `Accumulated wall time: ${report.wallSeconds} seconds.`,
    `Environment: Node ${nodeVersion}, Playwright ${playwrightVersion}, ${process.platform}/${process.arch}.`,
    '',
    report.limitation,
    '',
  ];
  writeFileSync(join(outputDir, 'repeated-profile.md'), `${lines.join('\n')}\n`);
  if (
    report.successfulRuns !== countArg ||
    report.firstAttemptOutcomes.retries > 0 ||
    report.firstAttemptOutcomes.skips > 0
  ) {
    process.exitCode = 1;
  }
}

if (require.main === module) {
  if (mode === 'faults') runFaultControls();
  else if (mode === 'repeat') runRepeatedProfile();
  else throw new Error('Usage: node scripts/reliability-lab.js faults | repeat [20..50]');
}

module.exports = { isExpectedOutcome, isSuccessfulTest };
