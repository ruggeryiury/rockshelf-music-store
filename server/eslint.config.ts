import { defineConfig } from 'eslint/config'
import tseslint from 'typescript-eslint'

import js from '@eslint/js'

export default defineConfig(
	{
		ignores: ['dist'],
	},
	{
		files: ['src/**/*.ts'],
		extends: [js.configs.recommended, ...tseslint.configs.recommended],
		rules: {
			'@typescript-eslint/no-explicit-any': 'off',
			'@typescript-eslint/no-unused-vars': 'warn',
			'no-useless-assignment': 'off',
		},
	},
)
