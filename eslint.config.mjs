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
			'consistent-return': 'off',
			'default-param-last': 'off',
			'func-style': ['error', 'declaration'],
			'global-require': 'off',
			'id-length': 'off',
			'max-len': 'off',
			'max-lines': 'off',
			'max-lines-per-function': 'off',
			'max-params': 'off',
			'max-statements-per-line': ['error', { max: 2 }],
			'multiline-comment-style': 'off',
			'no-await-in-loop': 'off',
			'no-empty-function': 'off',
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
			'sort-keys': 'off',
		},
	},
];
