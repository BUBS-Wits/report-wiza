import { defineConfig, globalIgnores } from 'eslint/config'
import globals from 'globals'
import prettier from 'eslint-config-prettier'
import react from 'eslint-plugin-react'
import react_hooks from 'eslint-plugin-react-hooks'

export default defineConfig([
	prettier,
	globalIgnores([
		'**/node_modules/',
		'**/dist/',
		'**/coverage/',
		'**/build/',
	]),
	{
		files: ['**/*.{js,jsx}'],
		plugins: { react, 'react-hooks': react_hooks },
		languageOptions: {
			...react.configs.flat.recommended.languageOptions,
			ecmaVersion: 'latest',
			sourceType: 'module',
			globals: {
				...globals.browser,
				...globals.node,
			},
			parserOptions: {
				ecmaFeatures: {
					jsx: true,
				},
			},
		},
		rules: {
			'no-unused-vars': 'off',
			'no-undef': 'error',
			'no-console': 'off',
			'comma-spacing': 2,
			eqeqeq: ['error', 'always'],
			curly: 'error',
			...react.configs.recommended.rules,
			...react_hooks.configs.recommended.rules,
			'react/jsx-uses-react': 'error',
			'react/jsx-uses-vars': 'error',
			'react-hooks/set-state-in-effect': 'off',
			'no-use-before-define': [
				'warn',
				{
					functions: false,
					classes: true,
					variables: true,
				},
			],
		},
		settings: {
			react: { version: 'detect' },
		},
	},
])
