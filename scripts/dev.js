#!/usr/bin/env node
const { spawn } = require('child_process');
const { existsSync, readFileSync } = require('fs');
const { resolve } = require('path');

const ENV_FILES = ['.env.development.local', '.env.development', '.env.local', '.env'];
const env = { ...process.env };

function parseValue(raw) {
  let value = raw;
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  return value.replace(/\\n/g, '\n').replace(/\\r/g, '\r');
}

function loadEnvFile(filePath) {
  const contents = readFileSync(filePath, 'utf8');
  for (const line of contents.split(/\r?\n/)) {
    if (!line) continue;
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const match = line.match(/^\s*(?:export\s+)?([^=]+?)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    const key = match[1].trim();
    const rawValue = match[2];
    env[key] = parseValue(rawValue.trim());
  }
}

for (const file of ENV_FILES) {
  const filePath = resolve(process.cwd(), file);
  if (existsSync(filePath)) {
    loadEnvFile(filePath);
  }
}

env.SKIP_PIN = env.SKIP_PIN ?? 'true';

if (!env.TURSO_URL || !env.TURSO_AUTH_TOKEN) {
  console.error('Missing Turso configuration.');
  console.error('Set TURSO_URL and TURSO_AUTH_TOKEN in .env.development.local (or .env.local) before running `yarn dev`.');
  process.exit(1);
}

const nextBin = require.resolve('next/dist/bin/next');
const child = spawn(process.execPath, [nextBin, 'dev'], {
  stdio: 'inherit',
  env,
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});
