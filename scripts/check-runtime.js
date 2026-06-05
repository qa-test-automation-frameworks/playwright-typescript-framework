const semver = (value) => value.replace(/^v/, '').split('.').map(Number);

const [nodeMajor] = semver(process.version);
const npmVersion = process.env.npm_config_user_agent?.match(/npm\/(\d+\.\d+\.\d+)/)?.[1];
const [npmMajor] = npmVersion ? semver(npmVersion) : [0];

if (nodeMajor < 20) {
  process.stderr.write(`Node 20+ is required. Current runtime: ${process.version}\n`);
  process.exit(1);
}

if (npmMajor < 10) {
  process.stderr.write(`npm 10+ is required. Current npm: ${npmVersion || 'unknown'}\n`);
  process.exit(1);
}

process.stdout.write(`Runtime OK: Node ${process.version}, npm ${npmVersion}\n`);
