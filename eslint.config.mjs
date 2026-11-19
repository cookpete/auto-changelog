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
		files: ['**/*.mjs'],
		rules: {
			'func-style': ['error', 'declaration'],
			'multiline-comment-style': 'off',
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
			'sort-keys': 'off',
		},
	},

	{
		files: [
			'src/releases.mjs',
			'src/tags.mjs',
		],
		rules: {
			'id-length': 'warn',
		},
	},

	{
		files: ['src/tags.mjs'],
		rules: {
			'max-len': 'warn',
		},
	},

	{
		files: ['src/options.mjs'],
		rules: {
			'max-lines': 'warn',
		},
	},

	{
		files: [
			'src/options.mjs',
			'src/remote.mjs',
		],
		rules: {
			'max-lines-per-function': 'warn',
		},
	},

	{
		files: [
			'src/releases.mjs',
			'src/run.mjs',
		],
		rules: {
			'max-params': 'warn',
		},
	},

	{
		files: [
			'src/parse-commits.mjs',
			'src/releases.mjs',
			'src/remote.mjs',
		],
		rules: {
			'max-statements-per-line': ['error', { max: 2 }],
		},
	},

	{
		files: [
			'src/options.mjs',
			'src/releases.mjs',
		],
		rules: {
			'no-await-in-loop': 'warn',
		},
	},

	{
		files: ['test/run.mjs'],
		rules: {
			'no-empty-function': 'warn',
		},
	},

	{
		files: ['test/template.mjs'],
		rules: {
			'no-param-reassign': 'warn',
		},
	},

	{
		files: ['src/template.mjs'],
		rules: {
			'no-return-await': 'warn',
		},
	},

	{
		files: ['test/run.mjs'],
		rules: {
			'no-unused-vars': 'warn',
		},
	},

	{
		files: [
			'src/options.mjs',
			'src/parse-commits.mjs',
			'src/releases.mjs',
		],
		rules: {
			'prefer-named-capture-group': 'warn',
		},
	},
];
