import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import prettier from 'eslint-config-prettier';

export default [
  // Base configuration for all files
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parser: typescriptParser,
      parserOptions: {
        projectService: {
          allowDefaultProject: ['*.config.js', '*.config.ts', 'packages/db/prisma/seed.js'],
        },
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        process: 'readonly',
        console: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        global: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        vi: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': typescript,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...typescript.configs.recommended.rules,
      ...typescript.configs.stylistic.rules,
      ...prettier.rules,
    },
  },
  // Override for CommonJS files
  {
    files: ['**/*.cjs'],
    languageOptions: {
      sourceType: 'script',
    },
  },
  // Ignore patterns
  {
    ignores: [
      'python/**',
      'dist/**',
      'build/**',
      'node_modules/**',
      'coverage/**',
      '.turbo/**',
      '.next/**',
      '.nuxt/**',
      '.vercel/**',
    ],
  },
];
