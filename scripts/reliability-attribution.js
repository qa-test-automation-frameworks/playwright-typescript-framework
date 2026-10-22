const path = require('path');

function normalizeFile(file) {
  if (typeof file !== 'string' || !file) return '';
  const normalized = file.replace(/\\/g, '/').replace(/^\.\//, '');
  const markers = ['/tests/', '/src/', 'tests/', 'src/'];
  const offsets = markers
    .map((marker) => {
      const position = normalized.lastIndexOf(marker);
      return position < 0 ? null : position + marker.length;
    })
    .filter((offset) => offset !== null);
  return offsets.length ? normalized.slice(Math.max(...offsets)) : normalized.replace(/^\/+/, '');
}

function gatherTests(suites, rows = [], ancestors = [], inheritedFile = '') {
  for (const suite of suites || []) {
    const file = suite.file || inheritedFile;
    const isFileSuite = Boolean(suite.file && suite.line === 0 && suite.column === 0);
    const suitePath = suite.title && !isFileSuite ? [...ancestors, suite.title] : ancestors;
    gatherTests(suite.suites, rows, suitePath, file);

    for (const spec of suite.specs || []) {
      const specFile = normalizeFile(spec.file || file);
      for (const test of spec.tests || []) {
        rows.push({
          file: specFile,
          project: test.projectName || 'default',
          suites: suitePath,
          title: spec.title,
          test,
        });
      }
    }
  }
  return rows;
}

function hasIdentity(actual, expected) {
  return (
    actual.project === expected.project &&
    actual.file === normalizeFile(expected.file) &&
    actual.title === expected.title &&
    JSON.stringify(actual.suites) === JSON.stringify(expected.suites)
  );
}

function resultErrors(test) {
  return (test.results || []).flatMap((result) => result.errors || []);
}

function resultAttachments(test) {
  return (test.results || []).flatMap((result) => result.attachments || []);
}

function attachmentJson(test, name) {
  const attachment = resultAttachments(test).find((item) => item.name === name);
  if (!attachment || typeof attachment.body !== 'string') return null;
  try {
    return JSON.parse(Buffer.from(attachment.body, 'base64').toString('utf8'));
  } catch {
    return null;
  }
}

function errorAtSource(error, source) {
  return (
    normalizeFile(error?.location?.file) === normalizeFile(source.file) &&
    (source.line === undefined || error?.location?.line === source.line)
  );
}

function invalid(reason) {
  return { disposition: 'INVALID_CONTROL', reason };
}

function expectedFailureEvidence(control, test, error, attachmentPaths, preflight) {
  const failure = control.failure;
  if (!errorAtSource(error, failure.source)) return null;
  const message = error.message || '';

  if (failure.kind === 'selector-assertion') {
    return message.includes('toHaveText')
      ? { category: failure.kind, origin: 'test-assertion' }
      : null;
  }

  if (failure.kind === 'api-schema') {
    const metadata = attachmentJson(test, 'api-response-schema-failure.json');
    const valid =
      message.startsWith('ApiSchemaValidationError:') &&
      metadata?.schemaVersion === 1 &&
      metadata?.code === 'API_RESPONSE_SCHEMA_INVALID' &&
      metadata?.failureOrigin === 'response-schema' &&
      metadata?.method === 'GET' &&
      metadata?.path === '/articles' &&
      metadata?.status === 200;
    return valid ? { category: failure.kind, origin: metadata.failureOrigin } : null;
  }

  if (failure.kind === 'axe-rule') {
    const violations = attachmentJson(test, 'axe-violations.json');
    const found =
      Array.isArray(violations) &&
      violations.some(
        (violation) =>
          violation.id === failure.ruleId &&
          typeof violation.nodeCount === 'number' &&
          violation.nodeCount > 0,
      );
    return found ? { category: failure.kind, ruleId: failure.ruleId } : null;
  }

  if (failure.kind === 'visual-comparison') {
    if (!preflight?.baselineValid || !message.includes('toHaveScreenshot')) return null;
    const required = ['expected', 'actual', 'diff'];
    const attachments = resultAttachments(test);
    const valid = required.every((name) => {
      const attachment = attachments.find((item) => item.name?.endsWith(`-${name}.png`));
      return (
        attachment?.contentType === 'image/png' &&
        typeof attachment.path === 'string' &&
        attachmentPaths?.has(path.resolve(attachment.path))
      );
    });
    return valid ? { category: failure.kind, attachments: required } : null;
  }

  if (failure.kind === 'cleanup-teardown') {
    const metadata = attachmentJson(test, 'cleanup-failure.json');
    const valid =
      message.startsWith('CleanupAggregateError:') &&
      metadata?.schemaVersion === 1 &&
      metadata?.code === 'CLEANUP_FAILURE' &&
      metadata?.failureOrigin === 'test-fixture-teardown' &&
      Array.isArray(metadata.failures) &&
      metadata.failures.length === 1 &&
      metadata.failures[0].resourceType === 'article' &&
      metadata.failures[0].status === 503;
    return valid ? { category: failure.kind, origin: metadata.failureOrigin } : null;
  }

  return null;
}

function classifyControl({
  control,
  phase,
  execution,
  reportState,
  report,
  attachmentPaths = new Set(),
  preflight = {},
}) {
  if (execution?.timedOut || execution?.errorCode === 'ETIMEDOUT') {
    return invalid('process-timeout');
  }
  if (execution?.spawnError || execution?.signal || !Number.isInteger(execution?.exitCode)) {
    return invalid('process-did-not-complete');
  }
  if (reportState !== 'valid' || !report) {
    return invalid(
      reportState === 'malformed' ? 'native-report-malformed' : 'native-report-missing',
    );
  }
  if (Array.isArray(report.errors) && report.errors.length > 0) {
    return invalid('global-setup-or-reporter-error');
  }

  const cases = gatherTests(report.suites || []);
  if (cases.length === 0) return invalid('native-report-has-no-tests');
  const targetCases = cases.filter((item) => hasIdentity(item, control.identity));
  if (targetCases.length !== 1) return invalid('native-testcase-identity-mismatch');
  const targetCase = targetCases[0];
  const supportCases = [];
  for (const identity of control.support || []) {
    const matches = cases.filter((item) => hasIdentity(item, identity));
    if (matches.length !== 1) return invalid('support-testcase-identity-mismatch');
    supportCases.push(matches[0]);
  }
  if (cases.length !== 1 + supportCases.length) {
    return invalid('native-report-has-unexpected-test-count');
  }

  const successfulCase = (item) => {
    const test = item.test;
    return (
      test.status === 'expected' &&
      test.expectedStatus === 'passed' &&
      test.results?.length === 1 &&
      test.results[0].status === 'passed' &&
      resultErrors(test).length === 0
    );
  };
  if (supportCases.some((item) => !successfulCase(item))) {
    return invalid('setup-or-teardown-case-did-not-pass');
  }

  const nativeTest = targetCase.test;
  const results = nativeTest.results || [];
  if (results.length !== 1) return invalid('native-testcase-has-retries-or-no-result');
  const result = results[0];
  const errors = resultErrors(nativeTest);

  if (phase === 'clean') {
    if (execution.exitCode === 0 && successfulCase(targetCase)) {
      return { disposition: 'CLEAN', reason: 'native-testcase-passed-once' };
    }
    return invalid('clean-control-did-not-pass-exactly-once');
  }

  if (phase !== 'mutated') return invalid('unknown-control-phase');
  if (
    execution.exitCode === 0 &&
    nativeTest.status === 'expected' &&
    nativeTest.expectedStatus === 'passed' &&
    result.status === 'passed' &&
    errors.length === 0
  ) {
    return { disposition: 'MISSED', reason: 'mutated-testcase-passed' };
  }
  if (execution.exitCode === 0) return invalid('process-and-native-result-disagree');
  if (
    nativeTest.status !== 'unexpected' ||
    nativeTest.expectedStatus !== 'passed' ||
    result.status !== 'failed' ||
    errors.length !== 1
  ) {
    return invalid('mutated-native-outcome-was-not-one-expected-failure');
  }

  const evidence = expectedFailureEvidence(
    control,
    nativeTest,
    errors[0],
    attachmentPaths,
    preflight,
  );
  if (!evidence) return invalid('failure-origin-or-category-did-not-match');
  return { disposition: 'DETECTED', ...evidence };
}

function summarizeNumbers(values) {
  const sorted = values.filter(Number.isFinite).sort((left, right) => left - right);
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
  return {
    count: sorted.length,
    min: sorted[0],
    median: Math.round((median + Number.EPSILON) * 1000) / 1000,
    max: sorted[sorted.length - 1],
  };
}

module.exports = { classifyControl, gatherTests, summarizeNumbers };
