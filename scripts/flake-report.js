const fs = require('fs');
const path = require('path');

const resultsPath = path.resolve('test-results/results.json');
const reportPath = path.resolve('test-results/flake-report.md');
const metricsPath = path.resolve('test-results/portfolio-metrics-v1.json');
const enforce = process.argv.includes('--enforce');
const budgetPercent = Number.parseFloat(process.env.FLAKE_BUDGET_PERCENT || '1');
const deterministicProjects = new Set(['api', 'visual', 'accessibility', 'selector-contract']);

function collectSpecs(suites, rows = []) {
  for (const suite of suites || []) {
    collectSpecs(suite.suites, rows);
    for (const spec of suite.specs || []) {
      for (const test of spec.tests || []) {
        const results = test.results || [];
        const retries = Math.max(0, results.length - 1);
        const failedAttempts = results.filter((result) => result.status !== 'passed');
        rows.push({
          title: spec.title,
          file: spec.file,
          project: test.projectName || 'unknown',
          expected: test.expectedStatus,
          outcome: test.status,
          retries,
          failedAttempts: failedAttempts.length,
          durationMs: results.reduce((total, result) => total + (result.duration || 0), 0),
        });
      }
    }
  }
  return rows;
}

fs.mkdirSync(path.dirname(reportPath), { recursive: true });

if (!fs.existsSync(resultsPath)) {
  fs.writeFileSync(
    reportPath,
    '# Flake Report\n\nNo Playwright JSON results were found at `test-results/results.json`.\n',
  );
  if (enforce) {
    process.stderr.write('Cannot enforce flake policy without Playwright JSON results.\n');
    process.exit(1);
  }
  process.exit(0);
}

const payload = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
const rows = collectSpecs(payload.suites);
const interesting = rows.filter((row) => row.retries > 0 || row.outcome !== 'expected');
const retrying = rows.filter((row) => row.retries > 0);
const deterministicRetries = retrying.filter((row) => deterministicProjects.has(row.project));
const retryRatePercent = rows.length === 0 ? 0 : (retrying.length / rows.length) * 100;
const durationMs = rows.reduce((total, row) => total + row.durationMs, 0);

const metrics = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  framework: 'playwright-typescript-framework',
  run: {
    id: process.env.GITHUB_RUN_ID || null,
    attempt: Number.parseInt(process.env.GITHUB_RUN_ATTEMPT || '1', 10),
    commit: process.env.GITHUB_SHA || null,
    event: process.env.GITHUB_EVENT_NAME || 'local',
  },
  tests: {
    total: rows.length,
    expected: rows.filter((row) => row.outcome === 'expected').length,
    unexpected: rows.filter((row) => row.outcome !== 'expected').length,
    retried: retrying.length,
    retryRatePercent: Number(retryRatePercent.toFixed(2)),
    durationSeconds: Number((durationMs / 1000).toFixed(3)),
  },
  policy: {
    budgetPercent,
    deterministicRetryCount: deterministicRetries.length,
    quarantineFile: 'reliability/quarantine.yml',
  },
};

fs.writeFileSync(metricsPath, `${JSON.stringify(metrics, null, 2)}\n`);

const lines = [
  '# Flake And Runtime Report',
  '',
  `Total tests inspected: ${rows.length}`,
  `Tests with retries: ${retrying.length}`,
  `Retry rate: ${retryRatePercent.toFixed(2)}%`,
  `Unexpected outcomes: ${metrics.tests.unexpected}`,
  `Accumulated test duration: ${(durationMs / 1000).toFixed(3)} seconds`,
  `Retry budget: ${budgetPercent.toFixed(2)}%`,
  '',
];

if (interesting.length === 0) {
  lines.push('No retries or unexpected outcomes were recorded in this run.');
} else {
  lines.push('| Project | Spec | Outcome | Retries | Failed attempts | Seconds |');
  lines.push('|---|---|---:|---:|---:|---:|');
  for (const row of interesting) {
    lines.push(
      `| ${row.project} | ${row.file} - ${row.title} | ${row.outcome} | ${row.retries} | ${row.failedAttempts} | ${(row.durationMs / 1000).toFixed(3)} |`,
    );
  }
}

fs.writeFileSync(reportPath, `${lines.join('\n')}\n`);

if (enforce && deterministicRetries.length > 0) {
  process.stderr.write(
    `Deterministic projects used retries: ${deterministicRetries.map((row) => `${row.project}:${row.title}`).join(', ')}\n`,
  );
  process.exit(1);
}

if (enforce && retryRatePercent > budgetPercent) {
  process.stderr.write(
    `Retry rate ${retryRatePercent.toFixed(2)}% exceeds ${budgetPercent.toFixed(2)}% budget.\n`,
  );
  process.exit(1);
}
