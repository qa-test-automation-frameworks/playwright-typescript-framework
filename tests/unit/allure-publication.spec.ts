import { expect, test } from '@playwright/test';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

import { prepareAllureResults, requiredArtifacts } from '../../scripts/prepare-allure-results';

function fixture(
  ids = ['first', 'second'],
  expected = ['reports-api', 'reports-e2e'],
): { input: string; output: string; expected: string[] } {
  const root = mkdtempSync(join(tmpdir(), 'allure-publication-'));
  expected.forEach((artifact, index) => {
    const folder = join(root, 'input', artifact, 'allure-results');
    mkdirSync(folder, { recursive: true });
    const id = ids[index] ?? artifact;
    writeFileSync(
      join(folder, `${id}-result.json`),
      JSON.stringify({
        uuid: id,
        name: 'actual test',
        status: index ? 'failed' : 'passed',
      }),
    );
  });
  return { input: join(root, 'input'), output: join(root, 'output'), expected };
}

test('complete artifacts merge without dropping a failed result', () => {
  const { input, output, expected } = fixture();
  expect(prepareAllureResults(input, output, expected)).toEqual({
    artifacts: 2,
    results: 2,
    traceAttachmentsExcluded: 0,
  });
  const result: unknown = JSON.parse(readFileSync(join(output, 'second-result.json'), 'utf8'));
  expect(result).toMatchObject({ status: 'failed' });
});

test('Playwright traces stay out of the Allure report published to Pages', () => {
  const { input, output, expected } = fixture();
  const source = join(input, expected[0]!, 'allure-results');
  writeFileSync(join(source, 'trace-a.zip'), 'private DOM and network trace');
  writeFileSync(join(source, 'screenshot.png'), 'bounded screenshot');
  writeFileSync(
    join(source, 'first-result.json'),
    JSON.stringify({
      uuid: 'first',
      name: 'actual test',
      status: 'failed',
      attachments: [
        {
          name: 'trace',
          source: 'trace-a.zip',
          type: 'application/vnd.allure.playwright-trace',
        },
        { name: 'screenshot', source: 'screenshot.png', type: 'image/png' },
      ],
      steps: [
        {
          name: 'nested step',
          attachments: [
            {
              name: 'trace',
              source: 'trace-a.zip',
              type: 'application/vnd.allure.playwright-trace',
            },
          ],
        },
      ],
    }),
  );

  expect(prepareAllureResults(input, output, expected)).toMatchObject({
    artifacts: 2,
    results: 2,
    traceAttachmentsExcluded: 2,
  });
  const result = JSON.parse(readFileSync(join(output, 'first-result.json'), 'utf8')) as unknown as {
    attachments: unknown[];
    steps: Array<{ attachments: unknown[] }>;
  };
  expect(result.attachments).toEqual([
    { name: 'screenshot', source: 'screenshot.png', type: 'image/png' },
  ]);
  expect(result.steps[0]!.attachments).toEqual([]);
  expect(readFileSync(join(output, 'screenshot.png'), 'utf8')).toBe('bounded screenshot');
  expect(() => readFileSync(join(output, 'trace-a.zip'))).toThrow();
});

test('a missing shard rejects publication', () => {
  const { input, output, expected } = fixture();
  expect(() => prepareAllureResults(input, output, [...expected, 'reports-missing'])).toThrow(
    'Missing required artifact',
  );
});

test('an empty shard rejects publication', () => {
  const { input, output, expected } = fixture();
  mkdirSync(join(input, 'reports-empty', 'allure-results'), { recursive: true });
  expect(() => prepareAllureResults(input, output, [...expected, 'reports-empty'])).toThrow(
    'Empty Allure results',
  );
});

test('duplicate results cannot inflate the merged report', () => {
  const { input, output, expected } = fixture(['same', 'same']);
  expect(() => prepareAllureResults(input, output, expected)).toThrow(
    'Duplicate Allure result UUID',
  );
});

test('conflicting attachment contents reject publication', () => {
  const { input, output, expected } = fixture();
  expected.forEach((artifact, index) =>
    writeFileSync(join(input, artifact, 'allure-results', 'attachment.txt'), String(index)),
  );
  expect(() => prepareAllureResults(input, output, expected)).toThrow(
    'Conflicting Allure filename',
  );
});

test('invalid input leaves the existing published candidate untouched', () => {
  const { input, output, expected } = fixture();
  mkdirSync(output);
  writeFileSync(join(output, 'sentinel.txt'), 'previous complete candidate');
  writeFileSync(join(input, expected[0]!, 'allure-results', 'first-result.json'), '{}');
  expect(() => prepareAllureResults(input, output, expected)).toThrow('Invalid Allure result');
  expect(readFileSync(join(output, 'sentinel.txt'), 'utf8')).toBe('previous complete candidate');
});

test('scheduled publication requires the full cross-browser artifact matrix', () => {
  const { input, output } = fixture([], [...requiredArtifacts]);
  const result = spawnSync(
    process.execPath,
    [join(__dirname, '../../scripts/prepare-allure-results.js'), input, output],
    {
      encoding: 'utf8',
      env: { ...process.env, GITHUB_EVENT_NAME: 'schedule' },
    },
  );
  expect(result.status).toBe(1);
  expect(result.stderr).toContain('Missing required artifact: reports-firefox-regression');
});
