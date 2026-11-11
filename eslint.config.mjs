import nodeConfig from '@ljharb/eslint-config/flat/node/22';

export default [
	{
		ignores: [
			'coverage/',
			'test/data/',
		],
	},
	...nodeConfig,
	{
		files: ['**/*.js'],
		rules: {
			'arrow-body-style': 'off',
			'arrow-parens': 'off',
			'comma-dangle': [
				'error',
				{
					arrays: 'never',
					exports: 'never',
					functions: 'never',
					imports: 'never',
					objects: 'never',
				},
			],
			'consistent-return': 'off',
			curly: ['error', 'multi-line'],
			'default-param-last': 'off',
			'func-style': 'off',
			'global-require': 'off',
			'id-length': 'off',
			'max-len': 'off',
			'max-lines': 'off',
			'max-lines-per-function': 'off',
			'max-params': 'off',
			'multiline-comment-style': 'off',
			'no-await-in-loop': 'off',
			'no-confusing-arrow': 'off',
			'no-param-reassign': 'off',
			'no-promise-executor-return': 'off',
			'no-return-await': 'off',
			'no-shadow': 'off',
			'no-unused-vars': [
				'error',
				{
					args: 'none',
					caughtErrors: 'none',
					ignoreRestSiblings: true,
					vars: 'all',
				},
			],
			'no-use-before-define': [
				'error',
				{
					classes: false,
					functions: false,
					variables: false,
				},
			],
			'object-shorthand': 'off',
			'operator-linebreak': [
				'error',
				'after',
				{
					overrides: {
						':': 'before',
						'?': 'before',
						'|>': 'before',
					},
				},
			],
			'prefer-named-capture-group': 'off',
			'prefer-template': 'off',
			radix: 'off',
			semi: ['error', 'never'],
			'sort-keys': 'off',
			strict: 'off',
			'wrap-regex': 'off',
		},
	},
];
