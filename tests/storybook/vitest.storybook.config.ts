import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    include: ['tests/storybook/**/*.test.ts?(x)'],
    environment: 'jsdom',
    globals: true,
    setupFiles: ['tests/storybook/setup.ts'],
    exclude: [],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, '../../src'),
      '@server': resolve(__dirname, '../../src/server'),
      '@shared': resolve(__dirname, '../../src/shared'),
      'next/link': resolve(__dirname, '../../src/storybook/nextLinkMock.tsx'),
      'next/navigation': resolve(__dirname, '../../src/storybook/nextNavigationMock.ts'),
    },
  },
});
