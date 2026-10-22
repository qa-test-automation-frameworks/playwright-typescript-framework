const { spawnSync } = require('child_process');
const {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} = require('fs');
const { createHash } = require('crypto');
const os = require('os');
const { extname, join, relative, resolve, sep } = require('path');
const { classifyControl, gatherTests, summarizeNumbers } = require('./reliability-attribution');

const outputDir = join(process.cwd(), 'work', 'reliability-lab');
const targetRunner = join(process.cwd(), 'scripts', 'target-runner.js');
const mode = process.argv[2] || 'faults';
const { version: playwrightVersion } = require('@playwright/test/package.json');
const supportCases = [
  {
    project: 'setup',
    file: 'tests/setup/global-setup.ts',
    suites: [],
    title: 'global setup - authenticate and seed',
  },
  {
    project: 'teardown',
    file: 'tests/setup/global-teardown.ts',
    suites: [],
    title: 'global teardown - remove shared seed',
  },
];

const faults = [
  {
    name: 'selector',
    title: 'controlled UI selector contract',
    identity: {
      project: 'selector-contract',
      file: 'tests/contracts/selectors/controlled-ui.selectors.spec.ts',
      suites: ['Contract: controlled UI selectors'],
      title: 'feed exposes article-card selector surfaces @contract',
    },
    failure: {
      kind: 'selector-assertion',
      source: { file: 'tests/contracts/selectors/controlled-ui.selectors.spec.ts' },
    },
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
    identity: {
      project: 'api',
      file: 'tests/api/articles.api.spec.ts',
      suites: ['API: Articles & Comments'],
      title: 'List articles with tag filter @api',
    },
    failure: { kind: 'api-schema', source: { file: 'tests/api/articles.api.spec.ts' } },
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
    identity: {
      project: 'accessibility',
      file: 'tests/accessibility/critical-pages.accessibility.spec.ts',
      suites: ['Accessibility: Critical Pages', 'Unauthenticated pages'],
      title: 'Login page has no detectable WCAG violations @accessibility',
    },
    failure: {
      kind: 'axe-rule',
      ruleId: 'aria-hidden-focus',
      source: { file: 'tests/accessibility/critical-pages.accessibility.spec.ts' },
    },
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
    identity: {
      project: 'visual',
      file: 'tests/visual/critical-pages.visual.spec.ts',
      suites: ['Visual: Critical Pages Screenshot Comparison', 'Unauthenticated Pages'],
      title: 'Home feed matches baseline @visual',
    },
    failure: {
      kind: 'visual-comparison',
      source: { file: 'tests/visual/critical-pages.visual.spec.ts' },
    },
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
    identity: {
      project: 'api',
      file: 'tests/api/articles.api.spec.ts',
      suites: ['API: Articles & Comments'],
      title: 'Get article by slug @api',
    },
    failure: { kind: 'cleanup-teardown', source: { file: 'src/fixtures/cleanup.fixtures.ts' } },
    args: ['tests/api/articles.api.spec.ts', '--project=api', '--grep', 'Get article by slug'],
  },
];

const repeatedProfile = {
  file: 'tests/api/articles.api.spec.ts',
  titleFilter: 'List articles with tag filter',
  identity: {
    project: 'api',
    file: 'tests/api/articles.api.spec.ts',
    suites: ['API: Articles & Comments'],
    title: 'List articles with tag filter @api',
  },
};

function relativePath(file) {
  return relative(process.cwd(), file).split(sep).join('/');
}

function gitValue(ref) {
  const result = spawnSync('git', ['rev-parse', ref], {
    cwd: process.cwd(),
    encoding: 'utf8',
    timeout: 5_000,
  });
  return result.status === 0 ? result.stdout.trim() : null;
}

function executionEnvironment() {
  return {
    checkoutSha: gitValue('HEAD'),
    targetTreeSha: gitValue('HEAD:test-target'),
    githubRunId: process.env.GITHUB_RUN_ID || null,
    githubRunAttempt: process.env.GITHUB_RUN_ATTEMPT || null,
    githubRef: process.env.GITHUB_REF || null,
    runtime: {
      node: process.version,
      playwright: playwrightVersion,
      platform: process.platform,
      architecture: process.arch,
      cpuCount: os.availableParallelism ? os.availableParallelism() : os.cpus().length,
      totalMemoryBytes: os.totalmem(),
    },
  };
}

function prepareRunDirectory(runDir, testResultsDir = join(process.cwd(), 'test-results')) {
  const reportPath = resolve(runDir, 'results.json');
  rmSync(runDir, { recursive: true, force: true });
  rmSync(testResultsDir, { recursive: true, force: true });
  mkdirSync(runDir, { recursive: true });
  mkdirSync(testResultsDir, { recursive: true });
  return { reportPath, testResultsDir };
}

function readNativeReport(reportPath) {
  if (!existsSync(reportPath)) return { state: 'missing', report: null };
  try {
    const report = JSON.parse(readFileSync(reportPath, 'utf8'));
    if (!report || !Array.isArray(report.suites)) return { state: 'malformed', report: null };
    return { state: 'valid', report };
  } catch {
    return { state: 'malformed', report: null };
  }
}

function reportAttachments(report) {
  const found = [];
  const visit = (suites) => {
    for (const suite of suites || []) {
      visit(suite.suites);
      for (const spec of suite.specs || []) {
        for (const test of spec.tests || []) {
          for (const result of test.results || []) found.push(...(result.attachments || []));
        }
      }
    }
  };
  visit(report?.suites || []);
  return found;
}

function retainAttachments(report, runDir) {
  const inventory = [];
  const paths = new Set();
  let index = 0;
  for (const attachment of reportAttachments(report)) {
    const row = {
      name: attachment.name,
      contentType: attachment.contentType,
      embeddedBytes:
        typeof attachment.body === 'string' ? Buffer.from(attachment.body, 'base64').length : 0,
      reporterPath: attachment.path || null,
      retainedPath: null,
      sha256: null,
    };
    if (attachment.path) {
      const source = resolve(attachment.path);
      if (existsSync(source) && statSync(source).isFile()) {
        index += 1;
        const name = String(attachment.name || 'attachment').replace(/[^a-z0-9._-]+/gi, '_');
        const destination = join(
          runDir,
          'attachments',
          `${String(index).padStart(2, '0')}-${name}${extname(source)}`,
        );
        mkdirSync(join(runDir, 'attachments'), { recursive: true });
        copyFileSync(source, destination);
        row.retainedPath = relativePath(destination);
        row.sha256 = createHash('sha256').update(readFileSync(destination)).digest('hex');
        paths.add(source);
      }
    }
    inventory.push(row);
  }
  writeFileSync(
    join(runDir, 'attachment-inventory.json'),
    `${JSON.stringify(inventory, null, 2)}\n`,
  );
  return { inventory, paths };
}

function saveRunnerLog(runDir, result) {
  const combined = `${result.stdout || ''}\n${result.stderr || ''}`;
  const maximumBytes = 24 * 1024;
  const bounded = Buffer.from(combined).subarray(-maximumBytes).toString('utf8');
  writeFileSync(join(runDir, 'runner.log'), bounded);
}

function execute(name, args, extraEnv, runDir) {
  const { reportPath } = prepareRunDirectory(runDir);
  const targetPort = String(extraEnv.TARGET_PORT);
  const result = spawnSync(
    process.execPath,
    [targetRunner, 'npx', 'playwright', 'test', ...args, '--workers=1', '--retries=0'],
    {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: {
        ...process.env,
        CONTROLLED_TARGET_MODE: '1',
        RELIABILITY_FAULT: name || '',
        RELIABILITY_RESULTS_PATH: reportPath,
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
    },
  );
  saveRunnerLog(runDir, result);
  const native = readNativeReport(reportPath);
  const attachmentData = retainAttachments(native.report, runDir);
  const execution = {
    exitCode: result.status,
    signal: result.signal || null,
    errorCode: result.error?.code || null,
    spawnError: Boolean(result.error && result.error.code !== 'ETIMEDOUT'),
    timedOut: result.error?.code === 'ETIMEDOUT',
  };
  writeFileSync(join(runDir, 'execution.json'), `${JSON.stringify(execution, null, 2)}\n`);
  return {
    execution,
    reportPath,
    reportState: native.state,
    report: native.report,
    attachmentPaths: attachmentData.paths,
  };
}

function visualBaseline() {
  const snapshotPath = join(
    process.cwd(),
    'tests',
    'visual',
    'critical-pages.visual.spec.ts-snapshots',
    `home-feed-guest-visual-${process.platform}.png`,
  );
  if (!existsSync(snapshotPath)) return { path: relativePath(snapshotPath), valid: false };
  const bytes = readFileSync(snapshotPath);
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const valid =
    bytes.length > 24 &&
    bytes.subarray(0, signature.length).equals(signature) &&
    bytes.readUInt32BE(16) > 0 &&
    bytes.readUInt32BE(20) > 0;
  return {
    path: relativePath(snapshotPath),
    valid,
    sizeBytes: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex'),
  };
}

function compactResult(run, classification) {
  const tests = gatherTests(run.report?.suites || []);
  return {
    disposition: classification.disposition,
    ...(classification.reason ? { reason: classification.reason } : {}),
    ...(classification.category ? { category: classification.category } : {}),
    ...(classification.origin ? { origin: classification.origin } : {}),
    ...(classification.ruleId ? { ruleId: classification.ruleId } : {}),
    ...(classification.attachments ? { requiredAttachments: classification.attachments } : {}),
    processExitCode: run.execution.exitCode,
    nativeCaseCount: tests.length,
    report: relativePath(run.reportPath),
  };
}

function runFaultControls() {
  mkdirSync(outputDir, { recursive: true });
  const environment = executionEnvironment();
  const baseline = visualBaseline();
  const controls = [];

  for (const [index, fault] of faults.entries()) {
    const cleanRun = execute(
      '',
      fault.args,
      { CI: 'true', TARGET_PORT: 4310 + index * 2 },
      join(outputDir, 'faults', fault.name, 'clean'),
    );
    const cleanClassification = classifyControl({
      control: { ...fault, support: supportCases },
      phase: 'clean',
      ...cleanRun,
      preflight: { baselineValid: baseline.valid },
    });

    const mutatedRun = execute(
      fault.name,
      fault.args,
      { CI: 'true', TARGET_PORT: 4311 + index * 2 },
      join(outputDir, 'faults', fault.name, 'mutated'),
    );
    const mutatedClassification = classifyControl({
      control: { ...fault, support: supportCases },
      phase: 'mutated',
      ...mutatedRun,
      preflight: { baselineValid: fault.name !== 'visual' || baseline.valid },
    });

    const disposition =
      cleanClassification.disposition !== 'CLEAN'
        ? 'INVALID_CONTROL'
        : mutatedClassification.disposition;
    const row = {
      fault: fault.name,
      gate: fault.title,
      identity: fault.identity,
      failureRule: fault.failure.kind,
      clean: compactResult(cleanRun, cleanClassification),
      mutated: compactResult(mutatedRun, mutatedClassification),
      disposition,
      ...(disposition === 'INVALID_CONTROL' && cleanClassification.disposition !== 'CLEAN'
        ? { invalidReason: 'clean-control-did-not-establish-a-passing-baseline' }
        : {}),
    };
    controls.push(row);
    process.stdout.write(`${disposition} ${fault.name}: ${fault.title}\n`);
  }

  const report = {
    schemaVersion: 2,
    generatedAt: new Date().toISOString(),
    workflow: {
      runId: environment.githubRunId,
      runAttempt: environment.githubRunAttempt,
      ref: environment.githubRef,
    },
    source: {
      checkoutSha: environment.checkoutSha,
      targetTreeSha: environment.targetTreeSha,
      target:
        'repo-owned controlled RealWorld target; new target process for every clean/mutated run',
      ...(baseline.path ? { visualBaseline: baseline } : {}),
    },
    environment: environment.runtime,
    controls,
    detected: controls.filter((item) => item.disposition === 'DETECTED').length,
    missed: controls.filter((item) => item.disposition === 'MISSED').length,
    invalid: controls.filter((item) => item.disposition === 'INVALID_CONTROL').length,
    expected: faults.length,
  };
  writeFileSync(join(outputDir, 'fault-controls.json'), `${JSON.stringify(report, null, 2)}\n`);
  if (report.detected !== report.expected || report.missed > 0 || report.invalid > 0) {
    process.exitCode = 1;
  }
}

function isExpectedOutcome(test) {
  return test.status === 'expected';
}

function isSuccessfulTest(test) {
  return (
    isExpectedOutcome(test) &&
    test.expectedStatus === 'passed' &&
    test.results?.length === 1 &&
    test.results[0].status === 'passed' &&
    (test.results[0].errors || []).length === 0
  );
}

function runRepeatedProfile() {
  const countArg = Number(process.argv[3] || 20);
  if (!Number.isSafeInteger(countArg) || countArg < 20 || countArg > 50) {
    throw new Error(
      'Repeated reliability sample must be between 20 and 50 independent target runs.',
    );
  }
  mkdirSync(outputDir, { recursive: true });
  const profile = [
    repeatedProfile.file,
    '--project=api',
    '--grep',
    repeatedProfile.titleFilter,
    '--workers=1',
    '--retries=0',
  ];
  const control = { identity: repeatedProfile.identity, support: supportCases };
  const environment = executionEnvironment();
  const runs = [];
  for (let index = 1; index <= countArg; index += 1) {
    const started = Date.now();
    const run = execute(
      '',
      profile,
      { CI: 'true', TARGET_PORT: 4400 + index },
      join(outputDir, 'repeats', String(index).padStart(3, '0')),
    );
    const classification = classifyControl({ control, phase: 'clean', ...run });
    const tests = gatherTests(run.report?.suites || []);
    const firstAttemptStatuses = tests.map((item) => item.test.results?.[0]?.status || null);
    const passed = classification.disposition === 'CLEAN';
    const wallSeconds = Number(((Date.now() - started) / 1000).toFixed(3));
    runs.push({
      iteration: index,
      passed,
      disposition: classification.disposition,
      ...(classification.reason ? { reason: classification.reason } : {}),
      exitCode: run.execution.exitCode,
      totalCases: tests.length,
      expectedOutcomes: tests.filter((item) => isExpectedOutcome(item.test)).length,
      firstAttemptFailures: firstAttemptStatuses.filter((status) =>
        ['failed', 'timedOut', 'interrupted'].includes(status),
      ).length,
      retries: tests.reduce(
        (total, item) => total + Math.max(0, (item.test.results || []).length - 1),
        0,
      ),
      skipped: tests.filter((item) => item.test.status === 'skipped').length,
      wallSeconds,
      nativeCases: tests.map((item) => ({
        project: item.project,
        file: item.file,
        suites: item.suites,
        title: item.title,
        status: item.test.status,
        expectedStatus: item.test.expectedStatus,
        attemptStatuses: (item.test.results || []).map((attempt) => attempt.status),
      })),
      nativeReport: relativePath(run.reportPath),
    });
    process.stdout.write(
      `${passed ? 'PASS' : 'INVALID'} repeat ${index}/${countArg} (${wallSeconds}s)\n`,
    );
  }

  const rawWallSeconds = runs.map((run) => run.wallSeconds);
  const timeSummary = summarizeNumbers(rawWallSeconds);
  const report = {
    schemaVersion: 2,
    generatedAt: new Date().toISOString(),
    workflow: {
      runId: environment.githubRunId,
      runAttempt: environment.githubRunAttempt,
      ref: environment.githubRef,
    },
    source: {
      checkoutSha: environment.checkoutSha,
      targetTreeSha: environment.targetTreeSha,
      target: 'repo-owned controlled RealWorld target; a fresh target process per sample',
    },
    profile:
      'API list articles with tag filter; one worker; zero retries; current project dependencies included',
    selectedTest: repeatedProfile.identity,
    environment: environment.runtime,
    sampleSize: countArg,
    caseCountPerRun: runs[0]?.totalCases || 0,
    firstAttemptOutcomes: {
      failures: runs.reduce((total, run) => total + run.firstAttemptFailures, 0),
      retries: runs.reduce((total, run) => total + run.retries, 0),
      skips: runs.reduce((total, run) => total + run.skipped, 0),
    },
    successfulRuns: runs.filter((run) => run.passed).length,
    accumulatedWallSeconds: Number(
      runs.reduce((total, run) => total + run.wallSeconds, 0).toFixed(3),
    ),
    rawWallSeconds,
    wallTimeSummarySeconds: timeSummary,
    runs,
    decision:
      'Retain the existing one-worker, zero-retry API profile. This small controlled-target sample does not justify changing retry or timeout policy.',
    limitation:
      'Twenty runs on one hosted Windows runner and the repository-owned target do not estimate a production flake rate or predict another runner class.',
  };
  writeFileSync(join(outputDir, 'repeated-profile.json'), `${JSON.stringify(report, null, 2)}\n`);
  const lines = [
    '# Playwright controlled API repeat sample',
    '',
    `- Workflow run: ${environment.githubRunId || 'local'} (attempt ${environment.githubRunAttempt || 'unknown'}).`,
    `- Tested checkout: \`${environment.checkoutSha || 'unknown'}\`; controlled target tree: \`${environment.targetTreeSha || 'unknown'}\`.`,
    `- Scope: ${report.profile}; ${report.caseCountPerRun} native setup/test/teardown cases per run.`,
    `- Outcomes: ${report.successfulRuns}/${countArg} runs passed; ${report.firstAttemptOutcomes.failures} first-attempt failures, ${report.firstAttemptOutcomes.retries} retries, ${report.firstAttemptOutcomes.skips} skips.`,
    `- Wall time seconds (all runs): ${rawWallSeconds.join(', ')}.`,
    `- Wall time min/median/max: ${timeSummary?.min ?? 'n/a'} / ${timeSummary?.median ?? 'n/a'} / ${timeSummary?.max ?? 'n/a'} seconds.`,
    `- Runtime/resources: Node ${environment.runtime.node}, Playwright ${playwrightVersion}, ${process.platform}/${process.arch}, ${environment.runtime.cpuCount} logical CPUs, ${environment.runtime.totalMemoryBytes} bytes RAM.`,
    '',
    report.decision,
    report.limitation,
    '',
  ];
  writeFileSync(join(outputDir, 'repeated-profile.md'), `${lines.join('\n')}\n`);
  if (
    report.successfulRuns !== countArg ||
    report.firstAttemptOutcomes.failures > 0 ||
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

module.exports = {
  faults,
  isExpectedOutcome,
  isSuccessfulTest,
  prepareRunDirectory,
  supportCases,
  summarizeNumbers,
};
