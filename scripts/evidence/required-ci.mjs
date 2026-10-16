export const requiredJobs = [
  'fresh-clone-format',
  'lint-typecheck',
  'evidence-negative-control',
  'test-api',
  'test-e2e',
  'test-visual',
  'test-accessibility',
  'test-selector-contract',
  'test-cross-browser',
  'generate-allure-report',
];
export function assertRequiredJobs(needs, trigger) {
  for (const job of requiredJobs) {
    if (needs[job]?.result !== 'success')
      throw new Error(`Required job ${job} is ${needs[job]?.result ?? 'missing'}`);
  }
  const scheduled = needs['scheduled-full-cross-browser']?.result;
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
