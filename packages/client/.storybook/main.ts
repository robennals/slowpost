import type { StorybookConfig } from '@storybook/react-vite';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mergeConfig } from 'vite';

const storiesDir = dirname(fileURLToPath(import.meta.url));

const config: StorybookConfig = {
  stories: ['../components/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-links', '@storybook/addon-essentials'],
  framework: {
    name: '@storybook/react-vite',
    options: {}
  },
  docs: {
    autodocs: 'tag'
  },
  async viteFinal(config) {
    return mergeConfig(config, {
      esbuild: {
        jsxInject: "import React from 'react'"
      },
      resolve: {
        alias: {
          'next/image': join(storiesDir, 'nextImageMock.tsx')
        }
      }
    });
  }
};

export default config;
