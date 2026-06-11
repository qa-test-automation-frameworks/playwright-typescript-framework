const fs = require('fs');
const path = require('path');

const quarantinePath = path.resolve('reliability/quarantine.yml');
const contents = fs.readFileSync(quarantinePath, 'utf8');
const entries = contents.split(/\n(?=- id:)/).filter((entry) => entry.trim().startsWith('- id:'));
const today = new Date();

for (const entry of entries) {
  for (const field of ['id', 'owner', 'issue', 'reason', 'expires']) {
    if (!new RegExp(`(?:^|\\n)\\s*-?\\s*${field}:\\s*\\S+`).test(entry)) {
      throw new Error(`Quarantine entry is missing ${field}:\n${entry}`);
    }
  }
  const expiry = entry.match(/(?:^|\n)\s*expires:\s*(\d{4}-\d{2}-\d{2})/)?.[1];
  if (!expiry || Number.isNaN(Date.parse(`${expiry}T23:59:59Z`))) {
    throw new Error(`Quarantine entry has invalid expiry:\n${entry}`);
  }
  if (new Date(`${expiry}T23:59:59Z`) < today) {
    throw new Error(`Quarantine entry expired on ${expiry}:\n${entry}`);
  }
}

process.stdout.write(`Validated ${entries.length} quarantine entries.\n`);
