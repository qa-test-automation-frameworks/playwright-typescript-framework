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

function prepareAllureResults(input, output, expected = requiredArtifacts) {
  const included = [
    ...expected,
    ...scheduledArtifacts.filter(
      (artifact) => !expected.includes(artifact) && fs.existsSync(path.join(input, artifact)),
    ),
  ];
  const sources = [];
  const seenIds = new Set();
  for (const artifact of included) {
    const directory = path.join(input, artifact, 'allure-results');
    if (!fs.existsSync(directory)) throw new Error(`Missing required artifact: ${artifact}`);
    const files = fs.readdirSync(directory);
    const results = files.filter((file) => file.endsWith('-result.json'));
    if (!results.length) throw new Error(`Empty Allure results: ${artifact}`);
    for (const filename of results) {
      const result = JSON.parse(fs.readFileSync(path.join(directory, filename), 'utf8'));
      if (!result.uuid || !result.name || !result.status) {
        throw new Error(`Invalid Allure result: ${artifact}/${filename}`);
      }
      if (seenIds.has(result.uuid)) throw new Error(`Duplicate Allure result UUID: ${result.uuid}`);
      seenIds.add(result.uuid);
    }
    for (const filename of files) {
      const source = path.join(directory, filename);
      if (!fs.lstatSync(source).isFile()) throw new Error(`Unexpected Allure entry: ${source}`);
      sources.push({ source, filename });
    }
  }
  // Preflight all shards and conflicting filenames before touching existing output.
  const unique = new Map();
  for (const item of sources) {
    const bytes = fs.readFileSync(item.source);
    if (unique.has(item.filename) && !unique.get(item.filename).equals(bytes)) {
      throw new Error(`Conflicting Allure filename: ${item.filename}`);
    }
    unique.set(item.filename, bytes);
  }
  if (fs.existsSync(output))
    throw new Error(`Output already exists; use a fresh directory: ${output}`);
  fs.mkdirSync(output, { recursive: true });
  for (const [filename, bytes] of unique) fs.writeFileSync(path.join(output, filename), bytes);
  return { artifacts: included.length, results: seenIds.size };
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
