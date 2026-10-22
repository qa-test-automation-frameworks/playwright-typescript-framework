export const requiredJobs = [
  'fresh-clone-format',
  'lint-typecheck',
  'evidence-negative-control',
  'browser-trace-contract',
  'test-api',
  'test-e2e',
  'test-visual',
  'test-accessibility',
  'test-selector-contract',
  'shared-app-ui',
  'shared-app-rollback',
  'test-cross-browser',
  'reliability-lab',
  'generate-allure-report',
];

const scheduledJob = 'scheduled-full-cross-browser';
const candidateSharedAppJob = 'candidate-shared-app-ui';
const recognizedJobs = new Set([...requiredJobs, candidateSharedAppJob, scheduledJob]);

export function assertRequiredJobs(needs, trigger) {
  if (!needs || typeof needs !== 'object' || Array.isArray(needs))
    throw new Error('Required job results must be an object');

  const unexpected = Object.keys(needs).filter((job) => !recognizedJobs.has(job));
  if (unexpected.length > 0)
    throw new Error(`Unexpected required-ci dependency ${unexpected.join(', ')}`);

  for (const job of requiredJobs) {
    if (job === 'shared-app-ui') continue;
    if (needs[job]?.result !== 'success')
      throw new Error(`Required job ${job} is ${needs[job]?.result ?? 'missing'}`);
  }

  const pinnedTarget = needs['shared-app-ui']?.result;
  const candidateTarget = needs[candidateSharedAppJob]?.result;
  const targetResultsAreValid =
    (pinnedTarget === 'success' && candidateTarget === 'skipped') ||
    (pinnedTarget === 'skipped' && candidateTarget === 'success');
  if (!targetResultsAreValid) {
    throw new Error(
      'Required job shared-app-ui or candidate-shared-app-ui must succeed exactly once',
    );
  }

  const scheduled = needs[scheduledJob]?.result;
  if (
    trigger === 'schedule' ? scheduled !== 'success' : !['success', 'skipped'].includes(scheduled)
  )
    throw new Error('Scheduled cross-browser disposition is invalid');
}
if (
  process.argv[1]?.endsWith('/required-ci.mjs') ||
  process.argv[1]?.endsWith('\\required-ci.mjs')
) {
  assertRequiredJobs(JSON.parse(process.env.NEEDS_JSON ?? '{}'), process.env.GITHUB_EVENT_NAME);
  console.log('Every required native suite, control and evidence/rendering job succeeded');
}
