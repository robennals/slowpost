import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    exclude: ['codex_version/**'],
    environment: 'node',
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@server': resolve(__dirname, 'src/server'),
      '@shared': resolve(__dirname, 'src/shared'),
    },
  },
});
