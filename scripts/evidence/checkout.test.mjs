import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { inspectCheckout } from './checkout.mjs';

test('exact per-command checkout trust repairs ownership mismatch while rejecting dirty/wrong source', () => {
  const directory = mkdtempSync(join(tmpdir(), 'evidence-checkout-'));
  const git = (...args) =>
    execFileSync('git', args, {
      cwd: directory,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  const original = process.env.GIT_TEST_ASSUME_DIFFERENT_OWNER;
  try {
    git('init');
    writeFileSync(join(directory, 'source.txt'), 'native source\n');
    git('add', 'source.txt');
    git(
      '-c',
      'user.name=prayagv',
      '-c',
      'user.email=76861333+prayagv@users.noreply.github.com',
      'commit',
      '-m',
      'test: isolated checkout fixture',
    );
    const sha = git('rev-parse', 'HEAD');
    process.env.GIT_TEST_ASSUME_DIFFERENT_OWNER = 'true';
    const rejected = spawnSync('git', ['rev-parse', 'HEAD'], {
      cwd: directory,
      env: process.env,
      encoding: 'utf8',
    });
    assert.notEqual(rejected.status, 0);
    assert.match(rejected.stderr, /dubious ownership/);
    assert.equal(inspectCheckout(sha, directory), sha);
    assert.throws(() => inspectCheckout('a'.repeat(40), directory), /declared tested/);
    writeFileSync(join(directory, 'source.txt'), 'changed tracked source\n');
    assert.throws(() => inspectCheckout(sha, directory), /Command failed/);
  } finally {
    if (original === undefined) delete process.env.GIT_TEST_ASSUME_DIFFERENT_OWNER;
    else process.env.GIT_TEST_ASSUME_DIFFERENT_OWNER = original;
    rmSync(directory, { recursive: true, force: true });
  }
});
