import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

// 读取自定义API Handler检查插件
const apiHandlerPluginPath = path.resolve(
  __dirname,
  './src/lib/api/eslint-plugin/index.cjs',
);

const apiHandlerPlugin = await import(`file://${apiHandlerPluginPath}`);

const eslintConfig = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  eslintPluginPrettierRecommended,
  {
    rules: {
      'prettier/prettier': [
        2,
        {
          singleQuote: true,
          plugins: ['prettier-plugin-tailwindcss'],
        },
      ],
      'arrow-body-style': 0,
      'prefer-arrow-callback': 0,
      'import/no-anonymous-default-export': 0,
      '@typescript-eslint/no-explicit-any': 0,
    },
  },
  // 添加API Handler检查规则
  {
    files: ['**/app/api/**/*.ts'],
    plugins: {
      'api-handler': apiHandlerPlugin.default || apiHandlerPlugin,
    },
    rules: {
      'api-handler/use-api-handler': 2,
    },
  },
];

export default eslintConfig;
