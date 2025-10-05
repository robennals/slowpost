import { defineConfig, defineProject } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname =
  typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  test: {
    projects: [
      defineProject({
        extends: true,
        plugins: [
          storybookTest({
            configDir: path.join(dirname, '.storybook'),
            storybookScript: 'yarn storybook --ci'
          })
        ],
        test: {
          name: 'storybook',
          browser: {
            enabled: true,
            provider: 'playwright',
            headless: true,
            instances: [{ browser: 'chromium' }]
          },
          setupFiles: ['./.storybook/vitest.setup.ts']
        }
      })
    ]
  }
});
