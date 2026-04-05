import { defineConfig, globalIgnores } from 'eslint/config'
import globals from 'globals'
import prettier from 'eslint-config-prettier'

export default defineConfig([
	prettier,
	{
		files: ['app/frontend/**/*.js'],
		ignores: ['node_modules/**', 'dist/**', 'app/*/dist/**/*', 'app/*/node_modules/**/*', 'tests/dist/**/*', 'tests/node_modules/**/*', 'packages/*/dist/**/*', 'packages/*/node_modules/**/*'],

		languageOptions: {
			ecmaVersion: 'latest',
			sourceType: 'module',
			globals: {
				...globals.browser,
				...globals.node
			}
		},

		rules: {
			'no-unused-vars': 'warn',
			'no-undef': 'error',
			'no-console': 'off',
			'eqeqeq': ['error', 'always'],
			'curly': 'error',
		}
	},
	{
		files: ['packages/**/*.js', 'app/backend/**/*.js'],
		ignores: ['node_modules/**', 'dist/**', 'app/*/dist/**/*', 'app/*/node_modules/**/*', 'tests/dist/**/*', 'tests/node_modules/**/*', 'packages/*/dist/**/*', 'packages/*/node_modules/**/*'],
		languageOptions: {
			globals: {
				...globals.node
			}
		},
		rules: {
			'no-unused-vars': 'warn',
			'no-undef': 'error',
			'no-console': 'off',
			'eqeqeq': ['error', 'always'],
			'curly': 'error',
		}
	}
])
