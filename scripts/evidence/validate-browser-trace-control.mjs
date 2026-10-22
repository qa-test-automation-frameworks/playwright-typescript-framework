import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const output = process.env.BROWSER_TRACE_CONTROL_OUT ?? 'work/audit-2026-10-21/B2/trace-control';
const resultsPath = path.join(output, 'results.json');
const artifactRoot = path.join(output, 'artifacts');
const failureTitle = 'synthetic failure retains a trace after the expected action';
const passTitle = 'synthetic passing control leaves no retained trace';

assert.equal(
  process.env.NATIVE_TEST_OUTCOME,
  'failure',
  'the native browser control must exit with its intentional assertion failure',
);
const report = JSON.parse(readFileSync(resultsPath, 'utf8'));
const cases = [];
function visit(suites) {
  for (const suite of suites ?? []) {
    for (const spec of suite.specs ?? []) {
      for (const test of spec.tests ?? []) {
        for (const result of test.results ?? []) {
          cases.push({ title: spec.title, test, result });
        }
      }
    }
    visit(suite.suites);
  }
}
visit(report.suites);

function oneCase(title) {
  const matches = cases.filter((entry) => entry.title === title);
  assert.equal(matches.length, 1, `expected one native result for ${title}`);
  assert.equal(matches[0].test.results.length, 1, `${title} must not retry`);
  return matches[0];
}

const failed = oneCase(failureTitle);
const passed = oneCase(passTitle);
assert.equal(failed.result.status, 'failed', 'the expected assertion must fail natively');
assert.equal(passed.result.status, 'passed', 'the passing control must pass');
assert.ok(
  failed.result.errors.some((error) =>
    String(error.message).includes('Expected synthetic heading'),
  ),
  'the negative control must fail at its intended assertion',
);

const failedTraceAttachments = (failed.result.attachments ?? []).filter(
  (attachment) => attachment.name === 'trace' && attachment.contentType === 'application/zip',
);
const passedTraceAttachments = (passed.result.attachments ?? []).filter(
  (attachment) => attachment.name === 'trace' && attachment.contentType === 'application/zip',
);
assert.equal(failedTraceAttachments.length, 1, 'the failed case must retain exactly one trace');
assert.equal(passedTraceAttachments.length, 0, 'the passing case must not retain a trace');

function filesUnder(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(entryPath) : [entryPath];
  });
}

const traces = filesUnder(artifactRoot).filter((file) => path.basename(file) === 'trace.zip');
assert.equal(traces.length, 1, 'the artifact directory must contain exactly one trace archive');
assert.ok(statSync(traces[0]).size > 0, 'the retained trace archive must not be empty');
const reportedTrace = path.resolve(output, failedTraceAttachments[0].path);
assert.equal(reportedTrace, path.resolve(traces[0]), 'the failed test must own the retained trace');

const archiveEntries = execFileSync('unzip', ['-Z1', traces[0]], { encoding: 'utf8' })
  .split(/\r?\n/)
  .filter(Boolean);
const traceEntries = archiveEntries.filter((entry) => entry.endsWith('.trace'));
assert.ok(traceEntries.length > 0, 'the trace archive must contain viewer-readable trace data');
const traceData = traceEntries
  .map((entry) => execFileSync('unzip', ['-p', traces[0], entry], { encoding: 'utf8' }))
  .join('\n');
assert.ok(
  traceData.includes('trace-control-expected-action'),
  'the viewer trace must retain the action step',
);
assert.ok(
  traceData.includes('trace-control-expected-assertion'),
  'the viewer trace must retain the failed assertion step',
);
assert.ok(traceData.includes('click'), 'the viewer trace must retain the browser click action');

process.stdout.write(
  'One expected failure has one inspectable trace; the passing case has none.\n',
);
