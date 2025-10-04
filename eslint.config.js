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
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
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
