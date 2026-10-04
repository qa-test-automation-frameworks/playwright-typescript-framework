import { execFileSync } from 'node:child_process';
import { realpathSync } from 'node:fs';

export function inspectCheckout(expectedSha, directory = process.cwd()) {
  if (!/^[0-9a-f]{40}$/.test(expectedSha)) throw new Error('Invalid declared source SHA');
  const workspace = realpathSync(directory);
  // Checkout's temporary HOME/global config need not survive into later container
  // steps. Trust only this explicit checkout per invocation, never a wildcard or
  // global config mutation; preserve exact SHA and tracked-dirty checks.
  const git = (...args) =>
    execFileSync('git', ['-c', `safe.directory=${workspace}`, ...args], {
      cwd: workspace,
      encoding: 'utf8',
    }).trim();
  const top = realpathSync(git('rev-parse', '--show-toplevel'));
  if (top !== workspace) throw new Error('Evidence must be collected at the checkout root');
  git('diff', '--quiet', '--no-ext-diff', '--no-textconv');
  git('diff', '--cached', '--quiet', '--no-ext-diff', '--no-textconv');
  const actual = git('rev-parse', 'HEAD');
  if (actual !== expectedSha)
    throw new Error('Checkout does not match the declared tested GitHub SHA');
  return actual;
}
