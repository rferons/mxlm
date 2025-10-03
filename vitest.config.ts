import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: [
      'apps/**/*.test.ts',
      'apps/**/*.test.tsx',
      'services/**/*.test.ts',
      'services/**/*.test.tsx',
      'infrastructure/**/*.test.ts',
      'infrastructure/**/*.test.tsx',
      'packages/**/*.test.ts',
      'packages/**/*.test.tsx',
    ],
    passWithNoTests: true,
  },
});
