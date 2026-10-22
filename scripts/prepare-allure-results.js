const fs = require('node:fs');
const path = require('node:path');

const requiredArtifacts = [
  'reports-api',
  'reports-e2e-1-of-2',
  'reports-e2e-2-of-2',
  'reports-visual-1-of-2',
  'reports-visual-2-of-2',
  'reports-accessibility',
  'reports-selector-contract',
  'reports-cross-browser',
];

const scheduledArtifacts = [
  'reports-firefox-regression',
  'reports-webkit-regression',
  'reports-mobile-chrome-regression',
];

function isPlaywrightTrace(attachment) {
  const name = String(attachment?.name ?? '').toLowerCase();
  const type = String(attachment?.type ?? attachment?.contentType ?? '').toLowerCase();
  return (
    type === 'application/vnd.allure.playwright-trace' ||
    (name === 'trace' &&
      (type === 'application/zip' || String(attachment?.source ?? '').endsWith('.zip')))
  );
}

function removeTraceAttachments(value, state) {
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1)
      value[index] = removeTraceAttachments(value[index], state);
    return value;
  }
  if (!value || typeof value !== 'object') return value;

  for (const [key, child] of Object.entries(value)) {
    if (key === 'attachments' && Array.isArray(child)) {
      value[key] = child.filter((attachment) => {
        if (isPlaywrightTrace(attachment)) {
          state.traceAttachmentsExcluded += 1;
          if (typeof attachment.source === 'string') state.traceSources.add(attachment.source);
          return false;
        }
        if (typeof attachment?.source === 'string') state.retainedSources.add(attachment.source);
        return true;
      });
    } else {
      value[key] = removeTraceAttachments(child, state);
    }
  }
  return value;
}

function prepareAllureResults(input, output, expected = requiredArtifacts) {
  const included = [
    ...expected,
    ...scheduledArtifacts.filter(
      (artifact) => !expected.includes(artifact) && fs.existsSync(path.join(input, artifact)),
    ),
  ];
  const sources = [];
  const seenIds = new Set();
  const attachmentState = {
    traceAttachmentsExcluded: 0,
    traceSources: new Set(),
    retainedSources: new Set(),
  };
  for (const artifact of included) {
    const directory = path.join(input, artifact, 'allure-results');
    if (!fs.existsSync(directory)) throw new Error(`Missing required artifact: ${artifact}`);
    const files = fs.readdirSync(directory);
    const results = files.filter((file) => file.endsWith('-result.json'));
    if (!results.length) throw new Error(`Empty Allure results: ${artifact}`);
    const parsedFiles = new Set();
    for (const filename of files.filter(
      (file) => file.endsWith('-result.json') || file.endsWith('-container.json'),
    )) {
      const filePath = path.join(directory, filename);
      const result = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const excludedBefore = attachmentState.traceAttachmentsExcluded;
      removeTraceAttachments(result, attachmentState);
      if (filename.endsWith('-result.json')) {
        if (!result.uuid || !result.name || !result.status) {
          throw new Error(`Invalid Allure result: ${artifact}/${filename}`);
        }
        if (seenIds.has(result.uuid))
          throw new Error(`Duplicate Allure result UUID: ${result.uuid}`);
        seenIds.add(result.uuid);
      }
      parsedFiles.add(filename);
      if (attachmentState.traceAttachmentsExcluded > excludedBefore)
        sources.push({ source: null, filename, bytes: Buffer.from(JSON.stringify(result)) });
    }
    for (const filename of files) {
      const source = path.join(directory, filename);
      if (!fs.lstatSync(source).isFile()) throw new Error(`Unexpected Allure entry: ${source}`);
      if (parsedFiles.has(filename) || !attachmentState.traceSources.has(filename))
        if (!sources.some((item) => item.filename === filename && item.source === null))
          sources.push({ source, filename });
    }
  }
  const ambiguousTraceSources = [...attachmentState.traceSources].filter((source) =>
    attachmentState.retainedSources.has(source),
  );
  if (ambiguousTraceSources.length)
    throw new Error(
      `Trace attachment filename is also used by another attachment: ${ambiguousTraceSources[0]}`,
    );
  // Preflight all shards and conflicting filenames before touching existing output.
  const unique = new Map();
  for (const item of sources) {
    const bytes = item.bytes ?? fs.readFileSync(item.source);
    if (unique.has(item.filename) && !unique.get(item.filename).equals(bytes)) {
      throw new Error(`Conflicting Allure filename: ${item.filename}`);
    }
    unique.set(item.filename, bytes);
  }
  if (fs.existsSync(output))
    throw new Error(`Output already exists; use a fresh directory: ${output}`);
  fs.mkdirSync(output, { recursive: true });
  for (const [filename, bytes] of unique) fs.writeFileSync(path.join(output, filename), bytes);
  return {
    artifacts: included.length,
    results: seenIds.size,
    traceAttachmentsExcluded: attachmentState.traceAttachmentsExcluded,
  };
}

if (require.main === module) {
  const expected =
    process.env.GITHUB_EVENT_NAME === 'schedule'
      ? [...requiredArtifacts, ...scheduledArtifacts]
      : requiredArtifacts;
  const summary = prepareAllureResults(
    process.argv[2] || 'merged-reports',
    process.argv[3] || 'allure-results',
    expected,
  );
  process.stdout.write(`${JSON.stringify(summary)}\n`);
}

module.exports = { prepareAllureResults, requiredArtifacts };
