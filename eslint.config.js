import { defineConfig, globalIgnores } from 'eslint/config'
import globals from 'globals'
import prettier from 'eslint-config-prettier'

export default defineConfig([
	prettier,
	globalIgnores(['**/node_modules/', '**/dist/', '**/coverage/']),
	{
		files: ['app/frontend/**/*.js'],
		languageOptions: {
			ecmaVersion: 'latest',
			sourceType: 'module',
			globals: {
				...globals.browser,
				...globals.node,
			},
		},

		rules: {
			'no-unused-vars': 'warn',
			'no-undef': 'error',
			'no-console': 'off',
			'comma-spacing': 2,
			eqeqeq: ['error', 'always'],
			curly: 'error',
		},
	},
	{
		files: ['packages/**/*.js', 'app/backend/**/*.js'],
		languageOptions: {
			globals: {
				...globals.node,
			},
		},
		rules: {
			'no-unused-vars': 'warn',
			'no-undef': 'error',
			'no-console': 'off',
			eqeqeq: ['error', 'always'],
			curly: 'error',
		},
	},
])
