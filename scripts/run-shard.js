const { spawnSync } = require('child_process');

const suite = process.argv[2];
const shard = process.env.SHARD || '1/1';

const projectsBySuite = {
  e2e: ['--project=chromium-authenticated', '--project=chromium-anonymous'],
  visual: ['--project=visual'],
};

const projects = projectsBySuite[suite];

if (!projects) {
  process.stderr.write('Usage: node scripts/run-shard.js <e2e|visual>\n');
  process.exit(1);
}

const result = spawnSync('npx', ['playwright', 'test', ...projects, `--shard=${shard}`], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

process.exit(result.status ?? 1);
