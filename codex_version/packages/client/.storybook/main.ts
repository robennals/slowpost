import { createRequire } from "node:module";
import type { StorybookConfig } from '@storybook/react-vite';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mergeConfig } from 'vite';

const require = createRequire(import.meta.url);

const storiesDir = dirname(fileURLToPath(import.meta.url));

const config: StorybookConfig = {
  stories: ['../components/**/*.stories.@(ts|tsx)'],
  addons: [getAbsolutePath("@storybook/addon-links")],

  framework: {
    name: getAbsolutePath("@storybook/react-vite"),
    options: {}
  },

  async viteFinal(config) {
    return mergeConfig(config, {
      esbuild: {
        jsxInject: "import React from 'react'"
      },
      resolve: {
        alias: {
          'next/link': join(storiesDir, 'nextLinkMock.tsx')
        }
      }
    });
  }
};

export default config;

function getAbsolutePath(value: string): any {
  return dirname(require.resolve(join(value, "package.json")));
}
