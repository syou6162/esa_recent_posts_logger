import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import js from '@eslint/js';
import globals from 'globals';
import tsParser from '@typescript-eslint/parser';
import { flatConfigs } from '@typescript-eslint/eslint-plugin/use-at-your-own-risk/raw-plugin';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default [
  {
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        sourceType: 'module',
        ecmaVersion: 2020,
        tsconfigRootDir: __dirname,
        project: ['./tsconfig.eslint.json'],
      },
      globals: globals.node,
    },
  },
  js.configs.recommended,
  ...flatConfigs['flat/recommended'],
  ...flatConfigs['flat/recommended-type-checked'],
];