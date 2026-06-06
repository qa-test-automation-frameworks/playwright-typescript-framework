const fs = require('fs');
const path = require('path');

const snapshotRoot = path.resolve('tests/visual');
const manifestPath = path.resolve('tests/visual/visual-snapshots.manifest.json');

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const expectedSnapshots = new Set(manifest.snapshots);
const actualSnapshots = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
      continue;
    }

    if (entry.name.endsWith('.png')) {
      actualSnapshots.push(path.relative(process.cwd(), fullPath).replace(/\\/g, '/'));
    }
  }
}

walk(snapshotRoot);

const missing = [...expectedSnapshots].filter((file) => !fs.existsSync(path.resolve(file)));
const unmanifested = actualSnapshots.filter((file) => !expectedSnapshots.has(file));

if (missing.length > 0 || unmanifested.length > 0) {
  const lines = ['Visual snapshot manifest check failed:'];
  if (missing.length > 0) {
    lines.push('Missing manifest snapshots:', ...missing.map((file) => `- ${file}`));
  }
  if (unmanifested.length > 0) {
    lines.push(
      'Snapshot PNG files not listed in tests/visual/visual-snapshots.manifest.json:',
      ...unmanifested.map((file) => `- ${file}`),
    );
  }
  process.stderr.write(`${lines.join('\n')}\n`);
  process.exitCode = 1;
}
