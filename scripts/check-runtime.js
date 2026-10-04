const fs = require('node:fs');
const path = require('node:path');
const pin = fs.readFileSync(path.join(__dirname, '..', '.nvmrc'), 'utf8').trim();
const expected = pin.split('.').map(Number);
const actual = /^(\d+)\.(\d+)\.(\d+)$/.exec(process.versions.node)?.slice(1).map(Number);
const npmPin = require('../package.json').packageManager.replace(/^npm@/, '');
const npmVersion = process.env.npm_config_user_agent?.match(/\bnpm\/([^\s]+)/)?.[1];

if (
  !/^\d+\.\d+\.\d+$/.test(pin) ||
  !actual ||
  actual[0] !== expected[0] ||
  actual[1] < expected[1] ||
  (actual[1] === expected[1] && actual[2] < expected[2])
) {
  process.stderr.write(
    `Node ${pin} or a newer stable patch/minor in the same major is required; detected ${process.version}. Install .nvmrc, then run npx --yes npm@${npmPin} ci.\n`,
  );
  process.exit(1);
}
if (npmVersion !== npmPin) {
  process.stderr.write(
    `npm ${npmPin} is required; detected ${npmVersion || 'unknown'}. Run npx --yes npm@${npmPin} ci.\n`,
  );
  process.exit(1);
}
process.stdout.write(`Runtime OK: Node ${process.version}, npm ${npmVersion}\n`);
