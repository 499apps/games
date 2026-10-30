import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    pool: 'threads',
    include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
    exclude: ['node_modules/**', 'dist/**', 'site/**', 'src/kit/smoke/**'],
    environment: 'node',
    reporters: ['default'],
  },
});
