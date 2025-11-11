import { defineConfig } from '@playwright/test';
import fs from 'fs';
import os from 'os';
import path from 'path';

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'slowpost-e2e-'));
const dbPath = path.join(tempRoot, 'playwright.sqlite');
const postmarkLogPath = path.join(tempRoot, 'postmark-log.json');
fs.writeFileSync(postmarkLogPath, '[]', 'utf8');

process.env.PLAYWRIGHT_TMP_DIR = tempRoot;
process.env.PLAYWRIGHT_POSTMARK_LOG = postmarkLogPath;
process.env.TURSO_URL = `file:${dbPath}`;
process.env.TURSO_AUTH_TOKEN = 'playwright-test-token';
process.env.SKIP_PIN = 'true';
process.env.DISABLE_EMAIL = 'true';
process.env.POSTMARK_SERVER_TOKEN = 'playwright-postmark-token';
process.env.POSTMARK_FROM_EMAIL = 'no-reply@slowpost.test';
process.env.NEXT_TELEMETRY_DISABLED = '1';
process.env.NODE_ENV = 'development';

const postmarkStub = path.resolve(__dirname, 'tests/e2e/stubs/register-postmark-stub.cjs');
const existingNodeOptions = process.env.NODE_OPTIONS ?? '';
const requireStub = `--require ${postmarkStub}`;
const nodeOptions = [existingNodeOptions.trim(), requireStub]
  .filter(Boolean)
  .join(' ')
  .trim();

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3100';

const headedEnv = process.env.PLAYWRIGHT_E2E_SHOW_BROWSER ?? '';
const showBrowser = ['1', 'true', 'yes'].includes(headedEnv.toLowerCase());
const slowMoRaw = process.env.PLAYWRIGHT_E2E_SLOWMO;
const slowMoFromEnv = slowMoRaw !== undefined ? Number(slowMoRaw) : undefined;
const slowMo = typeof slowMoFromEnv === 'number' && Number.isFinite(slowMoFromEnv) && slowMoFromEnv > 0
  ? slowMoFromEnv
  : showBrowser
    ? 500
    : undefined;

export default defineConfig({
  testDir: path.resolve(__dirname, 'tests/e2e'),
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL,
    trace: 'on-first-retry',
    headless: !showBrowser,
    launchOptions: slowMo
      ? {
          slowMo,
        }
      : undefined,
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
    {
      name: 'firefox',
      use: { browserName: 'firefox' },
    },
    {
      name: 'webkit',
      use: { browserName: 'webkit' },
    },
  ],
  globalTeardown: path.resolve(__dirname, 'tests/e2e/global-teardown.ts'),
  webServer: {
    command: 'yarn dev',
    url: baseURL,
    timeout: 180 * 1000,
    reuseExistingServer: !process.env.CI,
    env: {
      ...process.env,
      PORT: new URL(baseURL).port || '3000',
      NODE_ENV: 'development',
      NEXT_TELEMETRY_DISABLED: '1',
      NODE_OPTIONS: nodeOptions,
    },
  },
});
