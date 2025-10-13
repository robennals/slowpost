import { spawn } from 'child_process';
import http from 'http';

function parseArgs(argv) {
  const result = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (!arg.startsWith('--')) {
      continue;
    }

    const withoutPrefix = arg.slice(2);
    const equalsIndex = withoutPrefix.indexOf('=');

    if (equalsIndex !== -1) {
      const key = withoutPrefix.slice(0, equalsIndex);
      const value = withoutPrefix.slice(equalsIndex + 1);
      result[key] = value;
      continue;
    }

    const next = argv[index + 1];
    if (next && !next.startsWith('--')) {
      result[withoutPrefix] = next;
      index += 1;
    } else {
      result[withoutPrefix] = true;
    }
  }

  return result;
}

const cliArgs = parseArgs(process.argv.slice(2));
const mode = cliArgs.env ?? cliArgs.mode ?? process.env.STORYBOOK_TEST_ENV ?? 'browser';
const port = process.env.STORYBOOK_PORT ? Number(process.env.STORYBOOK_PORT) : 6006;
const host = '127.0.0.1';

function resolveBin(bin) {
  const ext = process.platform === 'win32' ? '.cmd' : '';
  return new URL(`../node_modules/.bin/${bin}${ext}`, import.meta.url).pathname;
}

function waitForStorybookReady(url) {
  const deadline = Date.now() + 60_000;
  return new Promise((resolve, reject) => {
    const check = () => {
      if (Date.now() > deadline) {
        reject(new Error('Storybook server did not start within 60 seconds'));
        return;
      }
      const request = http.get(url, (response) => {
        response.resume();
        if (response.statusCode && response.statusCode >= 200 && response.statusCode < 500) {
          resolve(undefined);
        } else {
          setTimeout(check, 500);
        }
      });
      request.on('error', () => {
        setTimeout(check, 500);
      });
    };
    check();
  });
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit', ...options });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve(undefined);
      } else {
        reject(new Error(`${command} exited with code ${code}`));
      }
    });
  });
}

async function runBrowserTests() {
  const storybookBin = resolveBin('storybook');
  const storybookArgs = ['dev', '--port', String(port), '--ci', '--no-open', '--disable-telemetry'];
  const server = spawn(storybookBin, storybookArgs, { stdio: 'inherit' });

  server.on('error', (error) => {
    console.error('Failed to start Storybook:', error);
  });

  try {
    await waitForStorybookReady({ hostname: host, port, path: '/' });
    const testBin = resolveBin('test-storybook');
    await runCommand(testBin, ['--ci', '--url', `http://${host}:${port}`]);
  } finally {
    server.kill('SIGTERM');
  }
}

async function runJsdomTests() {
  const vitestBin = resolveBin('vitest');
  await runCommand(vitestBin, ['run', '--config', 'tests/storybook/vitest.storybook.config.ts']);
}

async function main() {
  if (mode === 'browser') {
    await runBrowserTests();
    return;
  }

  if (mode === 'jsdom') {
    await runJsdomTests();
    return;
  }

  throw new Error(`Unknown STORYBOOK_TEST_ENV value: "${mode}"`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
