const { readdirSync, readFileSync, statSync } = require('fs');
const { join } = require('path');

const roots = ['src', 'tests', 'scripts', 'test-target'];
const checks = [
  ['waitForTimeout', /waitForTimeout/],
  ['waitForSelector', /waitForSelector/],
  ['page.$', /page\.\$/],
  ['test.only', /test\.only/],
  ['console.log', /console\.log/],
  ['as any', /\bas any\b/],
  ['browser-token page.evaluate', /page\.evaluate/],
  ['CSS selectors in page objects', /src[\\/]+pages[\\/]+.*locator\(['"]\./],
];

const files = [];
const walk = (path) => {
  for (const entry of readdirSync(path)) {
    const fullPath = join(path, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      if (
        ![
          'node_modules',
          '.git',
          'playwright-report',
          'allure-results',
          'allure-report',
          'test-results',
        ].includes(entry)
      ) {
        walk(fullPath);
      }
      continue;
    }
    if (/\.(ts|js|html|css)$/.test(entry)) files.push(fullPath);
  }
};

for (const root of roots) walk(root);
files.push('playwright.config.ts');
const scannedFiles = files.filter((file) => !file.endsWith('check-anti-patterns.js'));

let failed = false;
for (const file of scannedFiles) {
  const text = readFileSync(file, 'utf8');
  const lines = text.split(/\r?\n/);
  lines.forEach((line, index) => {
    const normalized = file.replace(/\\/g, '/');
    for (const [name, pattern] of checks) {
      const subject = name === 'CSS selectors in page objects' ? `${normalized}:${line}` : line;
      if (pattern.test(subject)) {
        failed = true;
        process.stderr.write(`${file}:${index + 1}: ${name}: ${line.trim()}\n`);
      }
    }
  });
}

if (failed) process.exit(1);
