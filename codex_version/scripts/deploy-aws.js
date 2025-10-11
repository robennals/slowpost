#!/usr/bin/env node
/*
 * Slowpost AWS deployment helper
 */

'use strict';

const { execSync } = require('child_process');

const REQUIRED_ENV = [
  'AWS_REGION',
  'AWS_ACCOUNT_ID',
  'SLOWPOST_WEB_ECR_REPOSITORY',
  'SLOWPOST_API_ECR_REPOSITORY',
  'SLOWPOST_ECS_CLUSTER',
  'SLOWPOST_ECS_SERVICE'
];

const missing = REQUIRED_ENV.filter((name) => !process.env[name]);

if (missing.length > 0) {
  console.error(
    `[deploy] Missing required environment variables: ${missing.join(', ')}. ` +
      'Please export them before running `yarn deploy`.'
  );
  process.exit(1);
}

const region = process.env.AWS_REGION;
const accountId = process.env.AWS_ACCOUNT_ID;
const webRepo = process.env.SLOWPOST_WEB_ECR_REPOSITORY;
const apiRepo = process.env.SLOWPOST_API_ECR_REPOSITORY;
const cluster = process.env.SLOWPOST_ECS_CLUSTER;
const service = process.env.SLOWPOST_ECS_SERVICE;
const profile = process.env.AWS_PROFILE;

const awsCli = profile ? `aws --profile ${profile}` : 'aws';
const ecrRegistry = `${accountId}.dkr.ecr.${region}.amazonaws.com`;

let imageTag = process.env.IMAGE_TAG;

if (!imageTag) {
  try {
    imageTag = execSync('git rev-parse --short HEAD').toString().trim();
  } catch (error) {
    imageTag = `deploy-${Date.now()}`;
    console.warn(
      `[deploy] Could not determine git commit hash. Falling back to generated tag ${imageTag}.`
    );
  }
}

function ensureCli(name, command) {
  try {
    execSync(command, { stdio: 'ignore' });
  } catch (error) {
    console.error(`[deploy] ${name} is required but was not found on PATH.`);
    process.exit(1);
  }
}

function run(command) {
  console.log(`\n[deploy] ${command}`);
  execSync(command, { stdio: 'inherit' });
}

ensureCli('Docker', 'docker --version');
ensureCli('AWS CLI v2', 'aws --version');

console.log('[deploy] Starting AWS deployment for Slowpost.');
console.log(`[deploy] Using AWS region ${region}.`);
if (profile) {
  console.log(`[deploy] Using AWS named profile ${profile}.`);
}
console.log(`[deploy] Image tag: ${imageTag}`);

const webImage = `${ecrRegistry}/${webRepo}`;
const apiImage = `${ecrRegistry}/${apiRepo}`;

run('yarn install --frozen-lockfile');
run('yarn workspace @slowpost/server build');
run('yarn workspace @slowpost/client build');

run(`docker build -f packages/client/Dockerfile -t ${webImage}:${imageTag} -t ${webImage}:latest .`);
run(`docker build -f packages/server/Dockerfile -t ${apiImage}:${imageTag} -t ${apiImage}:latest .`);

run(
  `${awsCli} ecr get-login-password --region ${region} | ` +
    `docker login --username AWS --password-stdin ${ecrRegistry}`
);

run(`docker push ${webImage}:${imageTag}`);
run(`docker push ${webImage}:latest`);
run(`docker push ${apiImage}:${imageTag}`);
run(`docker push ${apiImage}:latest`);

run(
  `${awsCli} ecs update-service ` +
    `--cluster ${cluster} ` +
    `--service ${service} ` +
    `--force-new-deployment ` +
    `--region ${region}`
);

console.log('\n[deploy] Deployment request submitted. ECS will roll out the new task definition using the freshly pushed images.');
