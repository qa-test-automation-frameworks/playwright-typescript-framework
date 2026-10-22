import { expect, test } from '@playwright/test';
import { accessSync, existsSync, mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { basename, join } from 'path';

import {
  classifyControl,
  type ControlExecution,
  type ControlClassification,
  type NativeReporterReport,
  type NativeReporterSuite,
  type NativeReporterTest,
} from '../../scripts/reliability-attribution';
import {
  faults,
  isExpectedOutcome,
  isSuccessfulTest,
  prepareRunDirectory,
  supportCases,
  summarizeNumbers,
  type ReliabilityFault,
  type ReliabilityIdentity,
} from '../../scripts/reliability-lab';

type Identity = ReliabilityIdentity;

type NativeError = {
  location: { file: string; line: number; column: number };
  message: string;
};

type NativeAttachment = {
  name: string;
  contentType: string;
  path?: string;
  body?: string;
};

type FixtureSpec = {
  title: string;
  file: string;
  line: number;
  column: number;
  tests: NativeReporterTest[];
};

type FixtureSuite = NativeReporterSuite & {
  specs: FixtureSpec[];
  suites: FixtureSuite[];
};

const completedExecution = (exitCode: number): ControlExecution => ({
  exitCode,
  signal: null,
  errorCode: null,
  spawnError: false,
  timedOut: false,
});

function jsonAttachment(name: string, value: unknown): NativeAttachment {
  return {
    name,
    contentType: 'application/json',
    body: Buffer.from(JSON.stringify(value)).toString('base64'),
  };
}

function nativeCase(
  identity: Identity,
  options: {
    status?: string;
    resultStatus?: string;
    errors?: NativeError[];
    attachments?: NativeAttachment[];
  } = {},
): NativeReporterTest {
  return {
    projectName: identity.project,
    status: options.status || 'expected',
    expectedStatus: 'passed',
    results: [
      {
        status: options.resultStatus || 'passed',
        errors: options.errors || [],
        attachments: options.attachments || [],
      },
    ],
  };
}

function suiteFor(identity: Identity, nativeTest: NativeReporterTest): FixtureSuite {
  const fileSuite = {
    title: basename(identity.file),
    file: identity.file,
    line: 0,
    column: 0,
    specs: [] as FixtureSpec[],
    suites: [] as FixtureSuite[],
  };
  let parent = fileSuite;
  for (const title of identity.suites) {
    const suite = {
      title,
      file: identity.file,
      line: 1,
      column: 1,
      specs: [] as FixtureSpec[],
      suites: [] as FixtureSuite[],
    };
    parent.suites.push(suite);
    parent = suite;
  }
  parent.specs.push({
    title: identity.title,
    file: identity.file,
    line: 2,
    column: 3,
    tests: [nativeTest],
  });
  return fileSuite;
}

function typedFailure(control: ReliabilityFault): {
  error: NativeError;
  attachments: NativeAttachment[];
  attachmentPaths: Set<string>;
} {
  const source = control.failure.source;
  const location = { file: source.file, line: source.line || 2, column: 3 };
  switch (control.failure.kind) {
    case 'selector-assertion':
      return {
        error: { location, message: 'Error: expect(locator).toHaveText(expected)' },
        attachments: [],
        attachmentPaths: new Set<string>(),
      };
    case 'api-schema':
      return {
        error: {
          location,
          message:
            'ApiSchemaValidationError: API response schema validation failed for GET /articles',
        },
        attachments: [
          jsonAttachment('api-response-schema-failure.json', {
            schemaVersion: 1,
            code: 'API_RESPONSE_SCHEMA_INVALID',
            failureOrigin: 'response-schema',
            method: 'GET',
            path: '/articles',
            status: 200,
          }),
        ],
        attachmentPaths: new Set<string>(),
      };
    case 'axe-rule':
      return {
        error: { location, message: 'Error: expected no accessibility violations' },
        attachments: [
          jsonAttachment('axe-violations.json', [
            { id: control.failure.ruleId, impact: 'serious', nodeCount: 1 },
          ]),
        ],
        attachmentPaths: new Set<string>(),
      };
    case 'visual-comparison': {
      const paths = [
        '/tmp/home-feed-expected.png',
        '/tmp/home-feed-actual.png',
        '/tmp/home-feed-diff.png',
      ];
      const names = ['expected', 'actual', 'diff'];
      return {
        error: { location, message: 'Error: expect(page).toHaveScreenshot(expected)' },
        attachments: paths.map((path, index) => ({
          name: `home-feed-guest-${names[index]}.png`,
          contentType: 'image/png',
          path,
        })),
        attachmentPaths: new Set(paths),
      };
    }
    case 'cleanup-teardown':
      return {
        error: { location, message: 'CleanupAggregateError: Cleanup failed for 1 resource.' },
        attachments: [
          jsonAttachment('cleanup-failure.json', {
            schemaVersion: 1,
            code: 'CLEANUP_FAILURE',
            failureOrigin: 'test-fixture-teardown',
            failures: [{ resourceType: 'article', status: 503 }],
          }),
        ],
        attachmentPaths: new Set<string>(),
      };
    default:
      throw new Error(`Unhandled fixture kind: ${control.failure.kind}`);
  }
}

function reportFor(
  control: ReliabilityFault,
  options: {
    mutated?: boolean;
    targetIdentity?: Identity;
    setupFailure?: NativeError;
    extraCase?: Identity;
    attachments?: NativeAttachment[];
  } = {},
): NativeReporterReport {
  const suites = supportCases.map((identity, index) => {
    const setupFailure = index === 0 ? options.setupFailure : undefined;
    return suiteFor(
      identity,
      nativeCase(identity, {
        ...(setupFailure
          ? { status: 'unexpected', resultStatus: 'failed', errors: [setupFailure] }
          : {}),
      }),
    );
  });
  const failure = options.mutated ? typedFailure(control) : null;
  const targetIdentity = options.targetIdentity || control.identity;
  suites.push(
    suiteFor(
      targetIdentity,
      nativeCase(targetIdentity, {
        ...(failure
          ? {
              status: 'unexpected',
              resultStatus: 'failed',
              errors: [failure.error],
              attachments: options.attachments || failure.attachments,
            }
          : {}),
      }),
    ),
  );
  if (options.extraCase) {
    suites.push(
      suiteFor(
        options.extraCase,
        nativeCase(options.extraCase, { status: 'unexpected', resultStatus: 'failed' }),
      ),
    );
  }
  return { suites, errors: [] };
}

function classifyFixture(
  control: ReliabilityFault,
  phase: 'clean' | 'mutated',
  options: Parameters<typeof reportFor>[1] = {},
  overrides: Record<string, unknown> = {},
): ControlClassification {
  const failure = options.mutated ? typedFailure(control) : null;
  return classifyControl({
    control: { ...control, support: supportCases },
    phase,
    execution: completedExecution(options.mutated ? 1 : 0),
    reportState: 'valid',
    report: reportFor(control, options),
    ...(failure ? { attachmentPaths: failure.attachmentPaths } : {}),
    preflight: { baselineValid: true },
    ...overrides,
  });
}

function firstFault(): ReliabilityFault {
  const control = faults[0];
  if (!control) throw new Error('reliability fault fixture list is empty');
  return control;
}

test('Playwright JSON reporter expected status only counts as a stable pass with one passing attempt', () => {
  expect(isExpectedOutcome({ status: 'expected', expectedStatus: 'passed' })).toBe(true);
  expect(
    isSuccessfulTest({
      status: 'expected',
      expectedStatus: 'passed',
      results: [{ status: 'passed', errors: [] }],
    }),
  ).toBe(true);
  expect(isExpectedOutcome({ status: 'unexpected', expectedStatus: 'passed' })).toBe(false);
  expect(
    isSuccessfulTest({
      status: 'flaky',
      expectedStatus: 'passed',
      results: [
        { status: 'passed', errors: [] },
        { status: 'passed', errors: [] },
      ],
    }),
  ).toBe(false);
  expect(
    isSuccessfulTest({
      status: 'skipped',
      expectedStatus: 'passed',
      results: [{ status: 'skipped', errors: [] }],
    }),
  ).toBe(false);
  expect(
    isSuccessfulTest({
      status: 'expected',
      expectedStatus: 'failed',
      results: [{ status: 'failed', errors: [] }],
    }),
  ).toBe(false);
});

test('each control requires the exact native testcase plus passing setup and teardown cases when clean', () => {
  for (const control of faults) {
    expect(classifyFixture(control, 'clean')).toEqual({
      disposition: 'CLEAN',
      reason: 'native-testcase-passed-once',
    });
  }
});

test('native reporter paths relative to the tests directory still match configured identities', () => {
  const control = firstFault();
  const report = reportFor(control);
  const stripTestsRoot = (suites: NativeReporterSuite[]): void => {
    for (const suite of suites) {
      if (suite.file?.startsWith('tests/')) suite.file = suite.file.slice('tests/'.length);
      for (const spec of suite.specs || []) {
        if (spec.file?.startsWith('tests/')) spec.file = spec.file.slice('tests/'.length);
      }
      stripTestsRoot(suite.suites || []);
    }
  };
  stripTestsRoot(report.suites);

  expect(
    classifyControl({
      control: { ...control, support: supportCases },
      phase: 'clean',
      execution: completedExecution(0),
      reportState: 'valid',
      report,
    }),
  ).toEqual({ disposition: 'CLEAN', reason: 'native-testcase-passed-once' });
});

test('Windows reporter paths and implementation-origin errors keep API faults attributable', () => {
  const control = faults.find((item) => item.name === 'api-schema');
  if (!control) throw new Error('API schema control fixture is missing');
  const report = reportFor(control, { mutated: true });
  const windowsReporterPath = (file: string): string =>
    file.replace(/^tests\//, '').replace(/\//g, '\\');
  const makePathsWindows = (suites: NativeReporterSuite[]): void => {
    for (const suite of suites) {
      if (suite.file) suite.file = windowsReporterPath(suite.file);
      if (suite.line === 0 && suite.column === 0) suite.title = windowsReporterPath(suite.title);
      for (const spec of suite.specs || []) {
        spec.file = windowsReporterPath(spec.file || '');
        for (const testCase of spec.tests || []) {
          for (const result of testCase.results || []) {
            for (const error of result.errors || []) {
              error.location = {
                line: error.location?.line || 1,
                column: error.location?.column || 1,
                file: ['D:', 'a', 'repo', 'src', 'api', 'BaseApiClient.ts'].join(
                  String.fromCharCode(92),
                ),
              };
            }
          }
        }
      }
      makePathsWindows(suite.suites || []);
    }
  };
  makePathsWindows(report.suites);

  expect(
    classifyControl({
      control: { ...control, support: supportCases },
      phase: 'mutated',
      execution: completedExecution(1),
      reportState: 'valid',
      report,
    }),
  ).toEqual({ disposition: 'DETECTED', category: 'api-schema', origin: 'response-schema' });
});

test('each intended failure is attributed from its native origin and typed evidence', () => {
  for (const control of faults) {
    expect(classifyFixture(control, 'mutated', { mutated: true }).disposition).toBe('DETECTED');
  }
});

test('a matching diagnostic in setup is invalid and cannot be attributed to the selected control', () => {
  for (const control of faults) {
    const setupError = typedFailure(control).error;
    expect(
      classifyFixture(control, 'mutated', { mutated: true, setupFailure: setupError }),
    ).toEqual({ disposition: 'INVALID_CONTROL', reason: 'setup-or-teardown-case-did-not-pass' });
  }
});

test('unrelated native test identities and extra failed cases are invalid controls', () => {
  const control = firstFault();
  const wrongIdentity = { ...control.identity, title: 'a different selector test @contract' };
  expect(
    classifyFixture(control, 'mutated', { mutated: true, targetIdentity: wrongIdentity }),
  ).toEqual({ disposition: 'INVALID_CONTROL', reason: 'native-testcase-identity-mismatch' });

  const extraIdentity: Identity = {
    ...control.identity,
    title: 'unrelated unexpected test @contract',
  };
  expect(classifyFixture(control, 'mutated', { mutated: true, extraCase: extraIdentity })).toEqual({
    disposition: 'INVALID_CONTROL',
    reason: 'native-report-has-unexpected-test-count',
  });
});

test('zero tests, global setup errors, absent reports, malformed reports, and timeouts are invalid', () => {
  const control = firstFault();
  const base = {
    control: { ...control, support: supportCases },
    phase: 'mutated' as const,
    execution: completedExecution(1),
    reportState: 'valid' as const,
    report: { suites: [], errors: [] },
  };
  expect(classifyControl(base)).toEqual({
    disposition: 'INVALID_CONTROL',
    reason: 'native-report-has-no-tests',
  });
  expect(
    classifyControl({ ...base, report: { suites: [], errors: [{ message: 'setup failed' }] } }),
  ).toEqual({
    disposition: 'INVALID_CONTROL',
    reason: 'global-setup-or-reporter-error',
  });
  expect(classifyControl({ ...base, reportState: 'missing', report: null })).toEqual({
    disposition: 'INVALID_CONTROL',
    reason: 'native-report-missing',
  });
  expect(classifyControl({ ...base, reportState: 'malformed', report: null })).toEqual({
    disposition: 'INVALID_CONTROL',
    reason: 'native-report-malformed',
  });
  expect(
    classifyControl({
      ...base,
      execution: {
        ...completedExecution(1),
        exitCode: null,
        timedOut: true,
        errorCode: 'ETIMEDOUT',
      },
    }),
  ).toEqual({ disposition: 'INVALID_CONTROL', reason: 'process-timeout' });
  expect(
    classifyControl({
      ...base,
      execution: {
        exitCode: null,
        signal: null,
        errorCode: 'ENOENT',
        spawnError: true,
        timedOut: false,
      },
    }),
  ).toEqual({ disposition: 'INVALID_CONTROL', reason: 'process-did-not-complete' });
});

test('the native testcase and process exit must agree on an intended failure', () => {
  const control = firstFault();
  const classifierInput = {
    control: { ...control, support: supportCases },
    phase: 'mutated' as const,
    reportState: 'valid' as const,
  };

  expect(
    classifyControl({
      ...classifierInput,
      execution: completedExecution(1),
      report: reportFor(control),
    }),
  ).toEqual({
    disposition: 'INVALID_CONTROL',
    reason: 'mutated-native-outcome-was-not-one-expected-failure',
  });

  expect(
    classifyControl({
      ...classifierInput,
      execution: completedExecution(0),
      report: reportFor(control, { mutated: true }),
    }),
  ).toEqual({
    disposition: 'INVALID_CONTROL',
    reason: 'process-and-native-result-disagree',
  });
});

test('visual failures need an existing baseline and all three native screenshot attachments', () => {
  const control = faults.find((item) => item.name === 'visual');
  if (!control) throw new Error('visual control fixture is missing');
  expect(
    classifyFixture(control, 'mutated', { mutated: true }, { preflight: { baselineValid: false } }),
  ).toEqual({ disposition: 'INVALID_CONTROL', reason: 'failure-origin-or-category-did-not-match' });
  expect(
    classifyFixture(control, 'mutated', {
      mutated: true,
      attachments: typedFailure(control).attachments.slice(0, 2),
    }),
  ).toEqual({ disposition: 'INVALID_CONTROL', reason: 'failure-origin-or-category-did-not-match' });
});

test('per-run preparation removes stale reports and attachments before the next process', () => {
  const root = mkdtempSync(join(tmpdir(), 'reliability-lab-unit-'));
  const runDir = join(root, 'faults', 'selector', 'mutated');
  const testResultsDir = join(root, 'test-results');
  mkdirSync(runDir, { recursive: true });
  mkdirSync(testResultsDir, { recursive: true });
  writeFileSync(join(runDir, 'results.json'), '{"stale":true}');
  writeFileSync(join(testResultsDir, 'results.json'), '{"stale":true}');
  writeFileSync(join(testResultsDir, 'old-screenshot.png'), 'stale');

  const { reportPath } = prepareRunDirectory(runDir, testResultsDir);

  expect(reportPath).toBe(join(runDir, 'results.json'));
  expect(() => accessSync(reportPath)).toThrow();
  expect(() => accessSync(join(testResultsDir, 'results.json'))).toThrow();
  expect(() => accessSync(join(testResultsDir, 'old-screenshot.png'))).toThrow();
  expect(existsSync(runDir)).toBe(true);
  expect(existsSync(testResultsDir)).toBe(true);
  rmSync(root, { recursive: true, force: true });
});

test('small samples report raw-friendly median and range without a tail estimate', () => {
  expect(summarizeNumbers([5, 2, 9, 4])).toEqual({ count: 4, min: 2, median: 4.5, max: 9 });
  expect(summarizeNumbers([3.995, 3.996])).toEqual({
    count: 2,
    min: 3.995,
    median: 3.996,
    max: 3.996,
  });
  expect(summarizeNumbers([])).toBeNull();
});
