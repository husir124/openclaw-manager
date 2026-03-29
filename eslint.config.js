import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // set-state-in-effect: 检测太严格，mount 时读 localStorage 同步状态是常见有效模式
      'react-hooks/set-state-in-effect': 'off',
      // react-refresh: Context Provider 和 HOC 导出是标准做法，不会影响 HMR
      'react-refresh/only-export-components': 'off',
      // exhaustive-deps: 警告级别太多干扰，手动检查依赖关系更可靠
      'react-hooks/exhaustive-deps': 'off',
    },
  },
])
