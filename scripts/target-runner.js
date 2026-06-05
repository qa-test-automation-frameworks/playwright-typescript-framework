const { spawn } = require('child_process');
const { randomUUID } = require('crypto');
const { dirname, join } = require('path');
const tsNodeBin = require.resolve('ts-node/dist/bin.js');
const playwrightCli = join(dirname(require.resolve('@playwright/test/package.json')), 'cli.js');

const env = {
  ...process.env,
  TARGET_PORT: process.env.TARGET_PORT || '4300',
  BASE_URL: process.env.BASE_URL || `http://127.0.0.1:${process.env.TARGET_PORT || 4300}`,
  API_URL: process.env.API_URL || `http://127.0.0.1:${process.env.TARGET_PORT || 4300}/api`,
  TEST_USER_EMAIL: process.env.TEST_USER_EMAIL || 'seed.user@example.test',
  TEST_USER_PASSWORD: process.env.TEST_USER_PASSWORD || `Seed-${randomUUID()}!`,
  TEST_USER_USERNAME: process.env.TEST_USER_USERNAME || 'seeduser',
};

const args = process.argv.slice(2);
let ready = false;
let childStarted = false;
let child;

const childInvocation = (command, commandArgs) => {
  if (command === 'npm' && process.env.npm_execpath) {
    return { command: process.execPath, args: [process.env.npm_execpath, ...commandArgs] };
  }

  if (command === 'npx' && commandArgs[0] === 'playwright') {
    return {
      command: process.execPath,
      args: [playwrightCli, ...commandArgs.slice(1)],
    };
  }

  return { command, args: commandArgs };
};

const target = spawn(process.execPath, [tsNodeBin, 'test-target/server.ts'], {
  env,
  stdio: ['ignore', 'pipe', 'inherit'],
  windowsHide: true,
});

const stop = () => {
  if (child && !child.killed) child.kill();
  if (!target.killed) target.kill();
};

const startupTimer = setTimeout(() => {
  if (!ready) {
    process.stderr.write('Controlled target did not become ready within 30 seconds.\n');
    stop();
    process.exit(1);
  }
}, 30_000);

process.on('exit', stop);
process.on('SIGINT', () => {
  stop();
  process.exit(130);
});

target.on('error', (error) => {
  clearTimeout(startupTimer);
  process.stderr.write(`Failed to start controlled target: ${error.message}\n`);
  process.exit(1);
});

target.stdout.on('data', (chunk) => {
  process.stdout.write(chunk);
  if (chunk.toString().includes('Controlled target ready') && args.length > 0 && !childStarted) {
    ready = true;
    childStarted = true;
    clearTimeout(startupTimer);
    const invocation = childInvocation(args[0], args.slice(1));
    child = spawn(invocation.command, invocation.args, {
      env,
      stdio: 'inherit',
      windowsHide: true,
    });
    child.on('error', (error) => {
      process.stderr.write(`Failed to run command under controlled target: ${error.message}\n`);
      stop();
      process.exit(1);
    });
    child.on('exit', (code) => {
      stop();
      process.exit(code || 0);
    });
  }
});

if (args.length === 0) {
  ready = true;
  clearTimeout(startupTimer);
  target.stdout.pipe(process.stdout);
}

target.on('exit', (code) => {
  clearTimeout(startupTimer);
  if (!ready) process.exit(code || 1);
});
