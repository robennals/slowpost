// @ts-nocheck
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    css: true,
    environment: 'jsdom',
    globals: true,
    include: ['**/*.test.{ts,tsx}'],
    setupFiles: ['./.storybook/vitest.setup.ts']
  }
});
