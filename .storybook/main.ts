import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(js|jsx|ts|tsx)'],
  addons: ['@storybook/addon-essentials'],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  docs: {
    autodocs: 'tag',
  },
  viteFinal: async (config) => {
    const configDir = dirname(fileURLToPath(import.meta.url));
    const root = dirname(configDir);
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      '@': join(root, 'src'),
      'next/link': join(root, 'src/storybook/nextLinkMock.tsx'),
      'next/navigation': join(root, 'src/storybook/nextNavigationMock.ts'),
    };
    return config;
  },
};

export default config;
