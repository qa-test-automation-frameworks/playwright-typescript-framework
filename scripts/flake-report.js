const fs = require('fs');
const path = require('path');

const resultsPath = path.resolve('test-results/results.json');
const reportPath = path.resolve('test-results/flake-report.md');

function collectSpecs(suites, rows = []) {
  for (const suite of suites || []) {
    collectSpecs(suite.suites, rows);
    for (const spec of suite.specs || []) {
      for (const test of spec.tests || []) {
        const retries = Math.max(0, (test.results || []).length - 1);
        const failedAttempts = (test.results || []).filter((result) => result.status !== 'passed');
        rows.push({
          title: spec.title,
          file: spec.file,
          project: test.projectName || 'unknown',
          expected: test.expectedStatus,
          outcome: test.outcome,
          retries,
          failedAttempts: failedAttempts.length,
        });
      }
    }
  }
  return rows;
}

if (!fs.existsSync(resultsPath)) {
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(
    reportPath,
    '# Flake Report\n\nNo Playwright JSON results were found at `test-results/results.json`.\n',
  );
  process.exit(0);
}

const payload = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
const rows = collectSpecs(payload.suites);
const interesting = rows.filter((row) => row.retries > 0 || row.outcome !== 'expected');

const lines = [
  '# Flake Report',
  '',
  `Total tests inspected: ${rows.length}`,
  `Tests with retries or unexpected outcomes: ${interesting.length}`,
  '',
];

if (interesting.length === 0) {
  lines.push('No retries or unexpected outcomes were recorded in this run.');
} else {
  lines.push('| Project | Spec | Outcome | Retries | Failed attempts |');
  lines.push('|---|---|---:|---:|---:|');
  for (const row of interesting) {
    lines.push(
      `| ${row.project} | ${row.file} - ${row.title} | ${row.outcome} | ${row.retries} | ${row.failedAttempts} |`,
    );
  }
}

fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, `${lines.join('\n')}\n`);
