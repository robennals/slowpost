import path from 'node:path';
import { fileURLToPath } from 'node:url';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default tseslint.config(
  {
    ignores: ['dist']
  },
  ...tseslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    files: ['src/**/*.ts', 'tests/**/*.ts'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node
      },
      parserOptions: {
        project: path.join(__dirname, 'tsconfig.eslint.json'),
        tsconfigRootDir: __dirname
      }
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' }
      ],
      '@typescript-eslint/no-misused-promises': [
        'error',
        { checksVoidReturn: false }
      ]
    }
  },
  eslintConfigPrettier
);
