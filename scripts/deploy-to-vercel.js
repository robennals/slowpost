#!/usr/bin/env node
const { spawnSync } = require('child_process');

const userArgs = process.argv.slice(2);

const sharedArgs = [];
if (process.env.VERCEL_TOKEN) {
  sharedArgs.push('--token', process.env.VERCEL_TOKEN);
}
if (process.env.VERCEL_ORG_ID) {
  sharedArgs.push('--org', process.env.VERCEL_ORG_ID);
}
if (process.env.VERCEL_PROJECT_ID) {
  sharedArgs.push('--project', process.env.VERCEL_PROJECT_ID);
}

function runVercel(command, extraArgs) {
  const result = spawnSync('vercel', [command, ...extraArgs, ...userArgs], {
    stdio: 'inherit',
    env: process.env,
  });

  if (result.error) {
    console.error(`Failed to run "vercel ${command}":`, result.error.message);
    process.exit(result.error.code || 1);
  }

  if (typeof result.status === 'number' && result.status !== 0) {
    process.exit(result.status);
  }
}

// Just deploy directly and let Vercel handle the build
runVercel('deploy', ['--prod', '--confirm', ...sharedArgs]);
