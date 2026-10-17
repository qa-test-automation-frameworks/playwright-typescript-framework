const baseUrl = process.env.SHARED_APP_BASE_URL;
const expectedSource = process.env.APP_SOURCE_REVISION;
const expectedFixture = process.env.APP_FIXTURE_VERSION;
if (!baseUrl || !expectedSource || !expectedFixture) {
  throw new Error('Shared app URL, source revision and fixture version are required.');
}

const deadline = Date.now() + 60_000;
let lastError;
while (Date.now() < deadline) {
  try {
    const response = await fetch(new URL('/health/ready', baseUrl), {
      signal: AbortSignal.timeout(3_000),
    });
    if (!response.ok) throw new Error(`readiness returned HTTP ${response.status}`);
    const ready = await response.json();
    if (
      ready.status !== 'ready' ||
      ready.sourceRevision !== expectedSource ||
      ready.seedVersion !== expectedFixture ||
      ready.datastore !== true
    )
      throw new Error('readiness identity does not match the pinned image and fixture');
    process.stdout.write(`ready ${ready.sourceRevision} ${ready.seedVersion}\n`);
    process.exit(0);
  } catch (error) {
    lastError = error;
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
}
throw new Error(
  `Reference app did not become ready within 60 seconds: ${lastError?.name ?? 'unknown error'}`,
);
