import js from '@eslint/js';

const nodeGlobals = {
  AbortSignal: 'readonly',
  Buffer: 'readonly',
  __dirname: 'readonly',
  clearTimeout: 'readonly',
  console: 'readonly',
  module: 'readonly',
  process: 'readonly',
  require: 'readonly',
  setTimeout: 'readonly',
};

export default [
  {
    ignores: ['dist/**', 'release/**', 'node_modules/**', 'coverage/**'],
  },
  {
    files: ['electron/**/*.cjs', 'scripts/**/*.mjs', 'eslint.config.js'],
    ...js.configs.recommended,
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: nodeGlobals,
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
      'no-console': 'off',
    },
  },
];
