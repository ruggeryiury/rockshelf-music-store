import js from '@eslint/js'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default defineConfig([
	globalIgnores(['dist']),
	{
		files: ['**/*.{ts,tsx}'],
		extends: [js.configs.recommended, tseslint.configs.recommended, reactHooks.configs.flat.recommended, reactRefresh.configs.vite],
		languageOptions: {
			globals: globals.browser,
		},
		rules: {
			'react-refresh/only-export-components': 0,
			'@typescript-eslint/no-unused-vars': 0,
			'react-hooks/set-state-in-effect': 0,
			'react-hooks/exhaustive-deps': 0,
		},
	},
])
