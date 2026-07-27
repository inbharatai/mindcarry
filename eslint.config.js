import js from '@eslint/js';

export default [
  js.configs.recommended,
  {
    ignores: ['dist/**', 'release/**', 'node_modules/**'],
    languageOptions: { ecmaVersion: 2023, sourceType: 'module', globals: { window: 'readonly', document: 'readonly', navigator: 'readonly' } },
    rules: { 'no-unused-vars': ['error', { argsIgnorePattern: '^_' }] },
  },
];
