import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { aggregateShards } from './playwright.mjs';

export function loadLeaf(path) {
  return {
    record: JSON.parse(readFileSync(path, 'utf8')),
    summary: JSON.parse(readFileSync(path.replace(/\.json$/, '.native-summary.json'), 'utf8')),
  };
}
const input = process.argv[2] ?? 'merged-reports';
const output = process.argv[3] ?? 'test-results/aggregate-evidence-v3.json';
const groups = [
  ['api', ['reports-api']],
  ['e2e', ['reports-e2e-1-of-2', 'reports-e2e-2-of-2']],
  ['visual', ['reports-visual-1-of-2', 'reports-visual-2-of-2']],
  ['accessibility', ['reports-accessibility']],
  ['selector-contract', ['reports-selector-contract']],
  ['cross-browser', ['reports-cross-browser']],
];
if (process.env.GITHUB_EVENT_NAME === 'schedule') {
  for (const project of ['firefox-regression', 'webkit-regression', 'mobile-chrome-regression'])
    groups.push([project, [`reports-${project}`]]);
}
const records = groups.map(([scope, artifacts]) => {
  const leaves = artifacts.map((artifact) =>
    loadLeaf(join(input, artifact, 'test-results/evidence-v3.json')),
  );
  if (leaves.some((leaf) => leaf.record.scope.id !== scope))
    throw new Error('Artifact scope identity mismatch');
  const record = aggregateShards(
    leaves,
    artifacts.map((_, index) => `shard-${index + 1}-of-${artifacts.length}`),
  );
  if (record.execution.disposition !== 'passed')
    throw new Error(`Non-passing required scope ${scope}`);
  return record;
});
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify({ schemaVersion: 1, records }, null, 2)}\n`);
console.log(`Validated ${records.length} substantive required scopes, all expected shards present`);
