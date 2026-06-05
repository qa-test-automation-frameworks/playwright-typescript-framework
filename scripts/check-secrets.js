const fs = require('fs');
const path = require('path');

const root = process.cwd();
const ignoredDirs = new Set([
  '.auth',
  '.git',
  '.idea',
  'allure-report',
  'allure-results',
  'node_modules',
  'playwright-report',
  'test-results',
]);

const forbidden = [
  /TEST_USER_PASSWORD=(?!replace-with|your-|$).+/i,
  /TEST_USER_EMAIL=(?!replace-with|your-|$).+/i,
  /Authorization:\s*Token\s+(?!\[REDACTED\])/i,
  /Bearer\s+[A-Za-z0-9._-]{20,}/,
];

const findings = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignoredDirs.has(entry.name)) {
      continue;
    }

    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
      continue;
    }

    const relPath = path.relative(root, fullPath);
    if (relPath === path.join('scripts', 'check-secrets.js')) {
      continue;
    }

    if (
      !/\.(env|example|json|md|ts|js|yml|yaml)$/i.test(entry.name) &&
      !entry.name.startsWith('.env')
    ) {
      continue;
    }

    const content = fs.readFileSync(fullPath, 'utf8');
    for (const pattern of forbidden) {
      if (pattern.test(content)) {
        findings.push(relPath);
        break;
      }
    }
  }
}

walk(root);

if (findings.length > 0) {
  process.stderr.write(
    `Potential secret values found:\n${findings.map((file) => `- ${file}`).join('\n')}\n`,
  );
  process.exitCode = 1;
}
